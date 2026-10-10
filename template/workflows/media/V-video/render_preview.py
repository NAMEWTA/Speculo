#!/usr/bin/env python3
"""Render reviewed offline HTML exposing window.render(t). Never installs tools.

Requires Python >=3.10, Playwright, preinstalled Chromium, Node, FFmpeg/ffprobe.
This is not a sandbox for hostile HTML or a substitute for observed quality review.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys


def run(argv: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(argv, check=True, capture_output=True, timeout=120, **kwargs)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_file(root: Path, name: str) -> Path:
    if not isinstance(name, str) or not name or Path(name).is_absolute() or any(x in ('..', '.', '') for x in name.split('/')) or '\\' in name or ':' in name:
        raise ValueError('unsafe asset path')
    current = root
    for part in Path(name).parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('linked asset not allowed')
    if not current.is_file():
        raise ValueError(f'missing asset: {name}')
    return current


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ('brief', 'plan', 'html', 'output'):
        parser.add_argument('--' + key, required=True, type=Path)
    parser.add_argument('--mode', choices=('preview', 'final'), default='preview')
    parser.add_argument('--review', type=Path)
    parser.add_argument('--reviewed-html', action='store_true')
    parser.add_argument('--chromium', default=shutil.which('chromium') or shutil.which('chromium-browser'))
    args = parser.parse_args()
    if not args.reviewed_html:
        raise ValueError('Review HTML and local assets before passing --reviewed-html')
    for path in (args.brief, args.plan, args.html):
        if path.is_symlink() or not path.is_file():
            raise ValueError('inputs must be existing non-linked regular files')
    for exe in ('node', 'ffmpeg', 'ffprobe'):
        if not shutil.which(exe):
            raise ValueError(f'missing {exe}; no automatic installation')
    if not args.chromium or not Path(args.chromium).is_file():
        raise ValueError('preinstalled Chromium required; no automatic download')
    from playwright.sync_api import sync_playwright
    brief, plan = json.loads(args.brief.read_text()), json.loads(args.plan.read_text())
    source = args.plan.resolve().parent
    tools = Path(__file__).resolve().parents[1] / 'common/tools/media-tools.mjs'
    # Business gates precede browser startup and all output writes.
    run(['node', str(tools), 'check-video', str(args.brief.resolve()), str(args.plan.resolve()), str(source)])
    assets = sorted(set([f for s in plan['shots'] for f in s['assets']] + ([plan['audio']] if plan['audio'] else [])))
    def input_records() -> dict:
        return {'brief': sha(args.brief.read_bytes()), 'plan': sha(args.plan.read_bytes()), 'html': sha(args.html.read_bytes()),
                'assets': {name: sha(safe_file(source, name).read_bytes()) for name in assets}}
    inputs = input_records()
    fingerprint = sha(json.dumps(inputs, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode())
    if args.mode == 'final':
        if not args.review:
            raise ValueError('final render requires actual, current-input review')
        program = 'const m=await import(process.env.MODULE);m.validateReview(m.readJSON(process.env.REVIEW),m.readJSON(process.env.BRIEF),m.readJSON(process.env.PLAN),process.env.DIGEST);'
        env = dict(os.environ, MODULE=tools.as_uri(), REVIEW=str(args.review.resolve()), BRIEF=str(args.brief.resolve()), PLAN=str(args.plan.resolve()), DIGEST=fingerprint)
        run(['node', '--input-type=module', '-e', program], env=env)
        review = json.loads(args.review.read_text())
        root = args.review.resolve().parent
        preview = safe_file(root, review['preview']['path'])
        if sha(preview.read_bytes()) != review['preview']['sha256']:
            raise ValueError('preview changed after review')
        probe = json.loads(run(['ffprobe', '-v', 'error', '-show_format', '-of', 'json', str(preview)]).stdout)
        if abs(float(probe['format']['duration']) - review['preview']['duration_seconds']) > 1 / brief['fps'] + .05:
            raise ValueError('reviewed duration disagrees with actual preview')
        for item in review['stills']:
            if sha(safe_file(root, item['path']).read_bytes()) != item['sha256']:
                raise ValueError('still changed after review')
    output = args.output.absolute()
    if output.exists() or output.is_symlink() or not output.parent.is_dir() or any(p.is_symlink() for p in output.parents):
        raise ValueError('output must be new, under an existing non-linked parent')
    fps = brief['fps']
    duration = brief['duration_seconds'] if args.mode == 'final' else min(30, brief['duration_seconds'])
    frames = math.ceil(duration * fps)
    if frames > 18000:
        raise ValueError('frame budget exceeded')
    for shot in plan['shots']:
        if math.ceil(shot['end'] * fps) - math.ceil(shot['start'] * fps) < 3:
            raise ValueError('each shot requires three distinct frame instants')
    output.mkdir(); (output / 'stills').mkdir(); (output / 'frames').mkdir()
    report = {'schema_version': 1, 'evidence_kind': 'executed', 'mode': args.mode, 'input_digest': fingerprint, 'inputs': inputs,
              'duration_seconds': duration, 'fps': fps, 'width': brief['width'], 'height': brief['height'], 'stills': [],
              'network_requests_blocked': [], 'determinism': False, 'status': 'started',
              'quality_review': 'Requires observation; no automatic human approval or aesthetic score'}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium, headless=True)
            context = browser.new_context(viewport={'width': brief['width'], 'height': brief['height']}, device_scale_factor=1,
                                          offline=True, service_workers='block', accept_downloads=False)
            def deny(route):
                report['network_requests_blocked'].append(route.request.url)
                route.abort()
            context.route('**/*', deny)
            page = context.new_page(); page.set_default_timeout(15000)
            page.set_content(args.html.read_text(), wait_until='load'); page.evaluate('document.fonts.ready')
            if not page.evaluate("typeof window.render === 'function'"):
                raise ValueError('window.render(t) is required')
            def image(t: float) -> bytes:
                page.evaluate('(t) => window.render(t)', t)
                return page.screenshot(type='png', animations='disabled')
            for shot in plan['shots']:
                first, last = math.ceil(shot['start'] * fps), math.ceil(shot['end'] * fps) - 1
                for number, frame in enumerate((first, (first + last) // 2, last), 1):
                    name = f"stills/{shot['id']}-{number}.png"; data = image(frame / fps)
                    (output / name).write_bytes(data)
                    report['stills'].append({'shot_id': shot['id'], 'path': name, 'time': frame / fps, 'sha256': sha(data)})
            # Sample every shot boundary: deterministic replay is necessary, not a universal proof.
            for shot in plan['shots']:
                a = image(shot['start']); image((shot['start'] + shot['end']) / 2); b = image(shot['start'])
                if a != b:
                    raise ValueError('non-deterministic tA -> tB -> tA replay')
            report['determinism'] = True
            for frame in range(frames):
                (output / 'frames' / f'{frame:06d}.png').write_bytes(image(frame / fps))
            context.close(); browser.close()
        if report['network_requests_blocked']:
            raise ValueError('external loading attempted; inline reviewed offline resources instead')
        if input_records() != inputs:
            raise ValueError('input drift while rendering')
        movie = output / ('preview.mp4' if args.mode == 'preview' else 'final.mp4')
        cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', '-framerate', str(fps), '-i', str(output / 'frames/%06d.png')]
        if plan['audio']:
            audio = safe_file(source, plan['audio'])
            audio_info = json.loads(run(['ffprobe', '-v', 'error', '-show_format', '-of', 'json', str(audio)]).stdout)
            if float(audio_info['format']['duration']) + 1 / fps < brief['duration_seconds']:
                raise ValueError('provided audio shorter than the complete requested timeline')
            cmd += ['-i', str(audio), '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac']
        cmd += ['-t', str(duration), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(movie)]
        run(cmd)
        probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(movie)]).stdout)
        video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
        if video['width'] != brief['width'] or video['height'] != brief['height'] or abs(float(probe['format']['duration']) - duration) > 1 / fps + .05:
            raise ValueError('encoded dimensions/duration mismatch')
        if input_records() != inputs:
            raise ValueError('input drift while encoding')
        probe['format']['filename'] = movie.name
        report.update(status='rendered-needs-review', output=movie.name, output_sha256=sha(movie.read_bytes()), ffprobe=probe)
    except Exception as exc:
        report.update(status='failed', error=str(exc)); raise
    finally:
        (output / 'render-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'path': str(movie), 'input_digest': fingerprint, 'status': report['status']}))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'media render stopped: {exc}', file=sys.stderr); sys.exit(1)
