#!/usr/bin/env python3
"""Render a local, deterministic window.render(seconds) HTML timeline to PNG/MP4.

No workflow manifests, plan files, approval scores or Node helpers are required.
Only use HTML you trust: a headless browser is not a security sandbox for source.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import importlib.util
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit, urlunsplit
from urllib.request import url2pathname


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def run(command: list[str]) -> str:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(f"{Path(command[0]).name} failed: {result.stderr.strip()}")
    return result.stdout


def probe(path: Path, ffprobe: str) -> dict:
    return json.loads(run([ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)]))


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--html", type=Path, required=True, help="Local HTML with window.render(t), t in seconds")
    parser.add_argument("--output", type=Path, required=True, help="A new directory; existing paths are never overwritten")
    parser.add_argument("--duration", type=float, required=True, help="Requested duration in seconds")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--audio", type=Path, help="Optional actual audio; padded or trimmed to the video duration")
    parser.add_argument("--sample-times", help="Comma-separated still times in seconds; default: start, middle, last frame")
    parser.add_argument("--chromium", type=Path, help="Use an existing Chromium executable instead of Playwright's installation")
    parser.add_argument("--keep-frames", action="store_true", help="Keep every frame as well as selected stills")
    parser.add_argument("--check-inputs", action="store_true", help="Validate inputs and report dependencies without launching a browser or creating output")
    return parser.parse_args()


def inputs(args: argparse.Namespace) -> dict:
    if not math.isfinite(args.duration) or args.duration <= 0:
        raise ValueError("--duration must be finite and greater than zero")
    if args.fps <= 0:
        raise ValueError("--fps must be greater than zero")
    if args.width <= 0 or args.height <= 0 or args.width % 2 or args.height % 2:
        raise ValueError("--width and --height must be positive even integers for H.264 yuv420p")
    args.html = args.html.expanduser().resolve(strict=True)
    if not args.html.is_file():
        raise ValueError("--html must be a file")
    args.output = args.output.expanduser().absolute()
    if args.output.exists() or args.output.is_symlink():
        raise ValueError("--output already exists; choose a new directory")
    if args.chromium:
        args.chromium = args.chromium.expanduser().resolve(strict=True)
        if not args.chromium.is_file():
            raise ValueError("--chromium must be an executable file")
    frame_count = math.ceil(args.duration * args.fps)
    effective_duration = frame_count / args.fps
    last_time = (frame_count - 1) / args.fps
    samples = [float(value.strip()) for value in args.sample_times.split(",")] if args.sample_times else [0.0, last_time / 2, last_time]
    if not samples or any(not math.isfinite(value) or value < 0 or value >= effective_duration for value in samples):
        raise ValueError("--sample-times must be finite times within the video (0 <= t < rendered duration)")
    samples = sorted(set(samples))
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    audio = None
    if args.audio:
        args.audio = args.audio.expanduser().resolve(strict=True)
        if not args.audio.is_file():
            raise ValueError("--audio must be a file")
        if not ffprobe:
            raise RuntimeError("ffprobe is required to inspect --audio")
        audio_probe = probe(args.audio, ffprobe)
        if not any(stream.get("codec_type") == "audio" for stream in audio_probe.get("streams", [])):
            raise ValueError("--audio contains no audio stream")
        audio = {"path": str(args.audio), "sha256": sha256(args.audio), "probe": audio_probe}
    playwright_found = importlib.util.find_spec("playwright") is not None
    return {
        "rendered": False,
        "html": {"path": str(args.html), "sha256": sha256(args.html)},
        "audio": audio,
        "width": args.width,
        "height": args.height,
        "fps": args.fps,
        "requested_duration": args.duration,
        "rendered_duration": effective_duration,
        "frame_count": frame_count,
        "sample_times": samples,
        "dependencies": {"ffmpeg": ffmpeg, "ffprobe": ffprobe, "python_playwright": playwright_found, "chromium_override": str(args.chromium) if args.chromium else None},
        "note": "Input checks do not launch Chromium, verify window.render, or prove visual/audio quality.",
    }


def render(args: argparse.Namespace, report: dict) -> None:
    dependencies = report["dependencies"]
    if not all((dependencies["ffmpeg"], dependencies["ffprobe"], dependencies["python_playwright"])):
        raise RuntimeError("Rendering requires ffmpeg, ffprobe and Python Playwright; see references/production.md")
    from playwright.sync_api import sync_playwright

    # Reserve a new output directory. Failures leave their own partial files for diagnosis.
    args.output.mkdir(parents=True, exist_ok=False)
    stills = args.output / "stills"
    stills.mkdir()
    frame_temp = None if args.keep_frames else tempfile.TemporaryDirectory(prefix="frames-", dir=args.output)
    frames = args.output / "frames" if args.keep_frames else Path(frame_temp.name)
    frames.mkdir(exist_ok=True)
    page_errors: list[str] = []
    blocked: list[str] = []
    missing_assets: list[str] = []
    loaded_files: dict[str, str] = {}

    def record_local_asset(request) -> None:
        if urlsplit(request.url).scheme == "file":
            path = Path(url2pathname(urlsplit(request.url).path)).resolve()
            try:
                loaded_files.setdefault(str(path), sha256(path))
            except OSError:
                missing_assets.append(str(path))

    def safe_url(url: str) -> str:
        parsed = urlsplit(url)
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))

    def route_request(route) -> None:
        if urlsplit(route.request.url).scheme in {"file", "data", "blob"}:
            route.continue_()
        else:
            blocked.append(safe_url(route.request.url))
            route.abort()

    def check_page() -> None:
        if blocked or missing_assets or page_errors:
            raise RuntimeError(f"HTML could not render cleanly: blocked network={blocked}, failed assets={missing_assets}, page errors={page_errors}")

    try:
        with sync_playwright() as playwright:
            launch = {"headless": True}
            if args.chromium:
                launch["executable_path"] = str(args.chromium)
            browser = playwright.chromium.launch(**launch)
            try:
                context = browser.new_context(viewport={"width": args.width, "height": args.height}, device_scale_factor=1, offline=True, service_workers="block")
                context.route("**/*", route_request)
                page = context.new_page()
                page.on("pageerror", lambda error: page_errors.append(str(error)))
                page.on("requestfinished", record_local_asset)
                page.on("requestfailed", lambda request: missing_assets.append(safe_url(request.url)))
                page.goto(args.html.as_uri(), wait_until="load", timeout=30000)
                if not page.evaluate("typeof window.render === 'function'"):
                    raise ValueError("HTML must define window.render(t), where t is time in seconds")

                def capture(time: float, path: Path | None = None) -> bytes:
                    page.evaluate("""async (time) => {
                        let timer;
                        try {
                            await Promise.race([
                                (async () => {
                                    await window.render(time);
                                    await document.fonts.ready;
                                    await Promise.all([...document.images].filter(img => img.currentSrc || img.getAttribute('src')).map(async img => {
                                        if (!img.complete) await new Promise((resolve, reject) => {
                                            img.addEventListener('load', resolve, {once:true});
                                            img.addEventListener('error', () => reject(new Error('Image failed to load')), {once:true});
                                        });
                                        if (!img.naturalWidth) throw new Error('Image has no decoded pixels');
                                    }));
                                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                                })(),
                                new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('render(t) or assets exceeded 30 seconds')), 30000);})
                            ]);
                        } finally { clearTimeout(timer); }
                    }""", time)
                    check_page()
                    result = page.screenshot(type="png", full_page=False, timeout=30000)
                    if path is not None:
                        path.write_bytes(result)
                    return result

                # A -> B -> A samples user-selected boundaries without imposing a shot plan.
                last_time = (report["frame_count"] - 1) / args.fps
                for time in report["sample_times"]:
                    first = capture(time)
                    capture(last_time if time != last_time else 0.0)
                    if capture(time) != first:
                        raise ValueError(f"Timeline is not deterministic: time {time:g} changed after seeking")
                report["determinism"] = {"checked_times": report["sample_times"], "passed": True, "scope": "Sampled A -> B -> A replay, not a proof for every possible time"}
                report["stills"] = []
                for index, time in enumerate(report["sample_times"]):
                    path = stills / f"{index:03d}.png"
                    capture(time, path)
                    report["stills"].append({"time": time, "path": path.relative_to(args.output).as_posix(), "sha256": sha256(path)})
                for index in range(report["frame_count"]):
                    capture(index / args.fps, frames / f"{index:06d}.png")
                check_page()
                report["browser"] = {"chromium": browser.version, "playwright": importlib.metadata.version("playwright")}
            finally:
                browser.close()

        video = args.output / "preview.mp4"
        command = [dependencies["ffmpeg"], "-hide_banner", "-loglevel", "error", "-nostdin", "-n", "-framerate", str(args.fps), "-i", str(frames / "%06d.png")]
        if args.audio:
            command += ["-i", str(args.audio), "-map", "0:v:0", "-map", "1:a:0", "-af", "apad", "-c:a", "aac", "-ar", "48000"]
        else:
            command += ["-an"]
        command += ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-t", str(report["rendered_duration"]), "-movflags", "+faststart", str(video)]
        run(command)
        actual = probe(video, dependencies["ffprobe"])
        video_streams = [stream for stream in actual.get("streams", []) if stream.get("codec_type") == "video"]
        audio_streams = [stream for stream in actual.get("streams", []) if stream.get("codec_type") == "audio"]
        if len(video_streams) != 1 or video_streams[0].get("width") != args.width or video_streams[0].get("height") != args.height:
            raise RuntimeError("Encoded video does not match the requested dimensions")
        if bool(audio_streams) != bool(args.audio):
            raise RuntimeError("Encoded audio presence does not match --audio")
        if abs(float(actual["format"]["duration"]) - report["rendered_duration"]) > max(1 / args.fps, 0.1):
            raise RuntimeError("Encoded duration differs from the frame timeline")
        for path, expected in loaded_files.items():
            if sha256(Path(path)) != expected:
                raise RuntimeError(f"Local asset changed during rendering: {path}")
        if sha256(args.html) != report["html"]["sha256"] or (args.audio and sha256(args.audio) != report["audio"]["sha256"]):
            raise RuntimeError("HTML or audio changed during rendering")
        report["loaded_local_assets"] = [{"path": path, "sha256": digest} for path, digest in sorted(loaded_files.items())]
        report.update(rendered=True, video={"path": video.name, "sha256": sha256(video), "probe": actual}, kept_frames=args.keep_frames, note="Rendered and probed successfully. Human-visible content, narration accuracy and audio sync still require watching/listening.")
        (args.output / "render-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    finally:
        if frame_temp:
            frame_temp.cleanup()


def main() -> int:
    args = arguments()
    try:
        report = inputs(args)
        if args.check_inputs:
            print(json.dumps(report, ensure_ascii=False, indent=2))
        else:
            render(args, report)
            print(f"Rendered {args.output / 'preview.mp4'} ({report['frame_count']} frames, {report['rendered_duration']:g}s)")
            print(f"Stills and technical report: {args.output}")
        return 0
    except (Exception, KeyboardInterrupt) as error:
        print(f"Render failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
