# B → V → P: 18-second local demonstration

This is an original **silent** example with a fictional account, not a published campaign. There are no copied third-party media, recipes or font binaries.

## Actual execution vs simulation

The implementation environment executed the checked-in brief, shot plan and deterministic HTML with Python Playwright, preinstalled Chromium and FFmpeg on 2026-10-10: 216 frames, 640×360, 12 fps, 18 seconds, nine stills (three per shot). It rendered a preview, inspected the actual stills and time sequence, passed nonsequential time replay and FFprobe checks, then rendered final.mp4 after recording the current review. No external resources were loaded.

The review is **assistant self-evaluation**, not independent human approval or a real-time human playback assessment. Silent mode was deliberately selected; audio_sync checks the silent contract, not spoken-audio alignment. Still inspection and deterministic replay do not prove arbitrary motion quality. Recorded output hashes document this run, not byte-identical encoding across different FFmpeg/browser versions.

P performed a real local export, copied final.mp4 and repeated export idempotently, using **SIMULATED TEST FIXTURE approval records**. No user authorization, real account, login, upload, publication or platform metrics are claimed. The fifth gate remains not-authorized. The checked-in draft request has **no approvals**; it cannot be exported without newly recorded, correctly scoped confirmations.

## Reproduce

Requires Python 3.10+, Python Playwright, preinstalled Chromium, Node, FFmpeg and FFprobe. Install/download only after separate authorization; this tool does neither. Review scene.html before running: network blocking is not a hostile-code sandbox.

```bash
python3 template/workflows/media/V-video/render_preview.py \
  --brief docs/media/example/brief.json \
  --plan docs/media/example/shot-plan.json \
  --html docs/media/example/scene.html \
  --output media-preview-run --reviewed-html
```

Output must be a new directory. Inspect preview.mp4 and all stills. Copy the workflow review template to that directory, fill its actual input_digest from render-report.json, actual preview/still SHA-256 values, observed checks and scores. Do not reuse observed-self-review.json blindly: it is evidence of one run only.

For final mode add `--mode final --review media-preview-run/review.json` and select a new output directory. The gate verifies current inputs, actual preview/still bytes, preview duration, three accepted stills per shot, every check and each score >=8. It never fills scores for you.

Use draft-request.example.json as an unapproved starting point, selecting real content/target aliases and media paths. Compute fingerprint-draft against the source media directory. After actual direction/platform/title/final confirmations, export-draft creates a local bundle. The fifth field is only not-authorized or external-human-handoff; exporting never publishes.

## Retrospective

The original message remained consistent across three scenes and the local draft. Platform metrics are null with reason “not published.” The next candidate experiment changes only the first scene's Hook; no template is promoted after one example. The 3–5 comparable real-run threshold has not been met.

brief.json, master.md, shot-plan.json and scene.html are editable inputs. observed-render-report.json, observed-self-review.json and observed-draft-report.json distinguish actual execution, self-evaluation and simulated approvals. Large frame/video binaries are not committed; regenerate them with the command above. Their absence in Git is not represented as a fresh render having occurred on the reader's machine.
