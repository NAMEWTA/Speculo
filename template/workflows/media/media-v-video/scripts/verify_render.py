#!/usr/bin/env python3
"""Exercise the real renderer CLI and optionally create inspectable PNG/MP4 artifacts.

--inputs-only needs Python and ffprobe; the default also needs Playwright,
Chromium and FFmpeg. No tests claim visual/narrative quality from encoding alone.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import wave

SCRIPT = Path(__file__).with_name("render_preview.py")
EXAMPLE = SCRIPT.parent.parent / "examples" / "timeline.html"


def invoke(html: Path, output: Path, *extra: str, success: bool = True) -> subprocess.CompletedProcess:
    command = [sys.executable, str(SCRIPT), "--html", str(html), "--output", str(output), "--duration", "2", "--width", "320", "--height", "180", "--fps", "12", *extra]
    result = subprocess.run(command, capture_output=True, text=True, timeout=180)
    if success and result.returncode != 0:
        raise AssertionError(f"Renderer failed:\n{result.stderr}")
    if not success and result.returncode == 0:
        raise AssertionError("Renderer accepted an invalid operation")
    return result


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as source:
        header = source.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n":
        raise AssertionError(f"Not a real PNG: {path}")
    return struct.unpack(">II", header[16:24])


def verify_movie(output: Path, with_audio: bool) -> dict:
    report = json.loads((output / "render-report.json").read_text())
    assert report["rendered"] is True
    assert report["frame_count"] == 24
    assert report["determinism"]["passed"] is True
    assert len(report["stills"]) == 3
    assert all(png_dimensions(output / still["path"]) == (320, 180) for still in report["stills"])
    assert len({still["sha256"] for still in report["stills"]}) > 1, "Timeline should visibly change"
    # Probe the real movie again, independently of the renderer's report.
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(output / "preview.mp4")], check=True, capture_output=True, text=True)
    actual = json.loads(probe.stdout)
    videos = [stream for stream in actual["streams"] if stream["codec_type"] == "video"]
    audios = [stream for stream in actual["streams"] if stream["codec_type"] == "audio"]
    assert len(videos) == 1 and videos[0]["codec_name"] == "h264"
    assert (videos[0]["width"], videos[0]["height"]) == (320, 180)
    assert int(videos[0]["nb_frames"]) == 24
    assert abs(float(actual["format"]["duration"]) - 2) <= 0.1
    assert bool(audios) is with_audio
    # Decode every frame and the audio; metadata alone can conceal corrupt output.
    subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-nostdin", "-i", str(output / "preview.mp4"), "-f", "null", "-"], check=True, capture_output=True)
    if with_audio:
        decoded = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(output / "preview.mp4"), "-map", "0:a:0", "-t", "0.25", "-f", "s16le", "-ac", "1", "-ar", "48000", "-"], check=True, capture_output=True).stdout
        samples = struct.unpack(f"<{len(decoded) // 2}h", decoded)
        assert max(abs(value) for value in samples) > 500, "Actual audio must survive the mux"
    return actual


def exercise(root: Path, inputs_only: bool, chromium: Path | None) -> None:
    root.mkdir(parents=True, exist_ok=False)
    html = root / "timeline.html"
    shutil.copyfile(EXAMPLE, html)
    audio = root / "tone.wav"
    with wave.open(str(audio), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(48000)
        # A shorter audio input exercises the documented padding behavior.
        stream.writeframes(b"".join(struct.pack("<h", int(6000 * math.sin(2 * math.pi * 440 * index / 48000))) for index in range(24000)))

    check_target = root / "checked-not-rendered"
    check = invoke(html, check_target, "--audio", str(audio), "--check-inputs")
    data = json.loads(check.stdout)
    assert data["rendered"] is False and data["frame_count"] == 24
    assert data["audio"]["probe"]["streams"][0]["codec_type"] == "audio"
    assert not check_target.exists(), "Input checks must not create render output"
    for extra in [("--width", "321"), ("--duration", "nan"), ("--sample-times", "0,3"), ("--audio", str(root / "missing.wav"))]:
        invoke(html, root / "invalid", *extra, "--check-inputs", success=False)
    sentinel = root / "existing"
    sentinel.mkdir()
    (sentinel / "keep.txt").write_text("existing user bytes")
    invoke(html, sentinel, "--check-inputs", success=False)
    assert (sentinel / "keep.txt").read_text() == "existing user bytes"
    print("PASS: real audio probe, input-only behavior, invalid geometry/time/audio, and no overwrite")
    if inputs_only:
        print("Rendering not exercised (--inputs-only).")
        return

    browser_args = ["--chromium", str(chromium)] if chromium else []
    # Local linked resources exercise actual file navigation rather than set_content.
    (root / "local.css").write_text("#dot { border: 2px solid white; }")
    html.write_text(html.read_text().replace("</head>", '<link rel="stylesheet" href="local.css"></head>'))
    invoke(html, root / "silent", *browser_args, "--keep-frames")
    verify_movie(root / "silent", with_audio=False)
    assert len(list((root / "silent" / "frames").glob("*.png"))) == 24
    report = json.loads((root / "silent" / "render-report.json").read_text())
    assert any(asset["path"].endswith("local.css") for asset in report["loaded_local_assets"])
    invoke(html, root / "audio", *browser_args, "--audio", str(audio), "--sample-times", "0,1,1.9")
    verify_movie(root / "audio", with_audio=True)
    assert not (root / "audio" / "frames").exists()
    print("PASS: real silent/audio MP4, decodable frames/audio, PNG sizes, changing timeline, local CSS, optional retained frames")

    missing = root / "no-render.html"
    missing.write_text("<!doctype html><h1>No timeline function</h1>")
    invoke(missing, root / "no-render-output", *browser_args, success=False)
    stateful = root / "stateful.html"
    stateful.write_text("<!doctype html><body style='background:#fff'><script>let n=0;window.render=()=>{document.body.style.background=(++n%3===0)?'#ff0000':'#0000ff'};</script></body>")
    invoke(stateful, root / "stateful-output", *browser_args, success=False)
    remote = root / "remote.html"
    remote.write_text("<!doctype html><img src='https://example.invalid/remote.png'><script>window.render=()=>{};</script>")
    invoke(remote, root / "remote-output", *browser_args, success=False)
    for invalid_output in ("no-render-output", "stateful-output", "remote-output"):
        assert not (root / invalid_output / "render-report.json").exists(), "Failed renders must not carry a success report"
    print("PASS: missing timeline, stateful replay and remote asset failures")
    print(f"Inspect produced stills and videos under: {root}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="A new directory to preserve artifacts; otherwise use a temporary directory")
    parser.add_argument("--inputs-only", action="store_true")
    parser.add_argument("--chromium", type=Path)
    args = parser.parse_args()
    if args.output:
        exercise(args.output.expanduser().absolute(), args.inputs_only, args.chromium)
    else:
        with tempfile.TemporaryDirectory(prefix="speculo-render-verification-") as directory:
            exercise(Path(directory) / "artifacts", args.inputs_only, args.chromium)


if __name__ == "__main__":
    main()
