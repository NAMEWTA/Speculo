"""Apply reviewed text edits to the pinned checkout, verifying all final bytes."""
from pathlib import Path, PurePosixPath
import hashlib
import sys

parts = Path(sys.argv[1]).resolve(strict=True)
checkout = Path(sys.argv[2]).resolve(strict=True)
root = checkout / 'template/workflows/specdev'
expected = '3e8a04f8738e058b0e11d4c2d57e0baf6b5fda086b38e018456d7fac009b611c'
changes = {}
for number in range(6):
    lines = (parts / f'{number:02d}.txt').read_text(encoding='utf-8').splitlines(keepends=True)
    i = 0
    while i < len(lines):
        header = lines[i].rstrip('\n')
        if not header.startswith('@@FILE '):
            raise SystemExit(f'Invalid file header in part {number}: {header}')
        relative = header[7:]
        path = PurePosixPath(relative)
        if path.is_absolute() or '..' in path.parts or '\\' in relative or relative in changes:
            raise SystemExit(f'Unsafe or duplicate path: {relative}')
        target = root / relative
        if root.resolve() not in target.resolve().parents:
            raise SystemExit(f'Out-of-root path: {relative}')
        for ancestor in [target, *target.parents]:
            if ancestor == checkout:
                break
            if ancestor.is_symlink():
                raise SystemExit(f'Symlink target forbidden: {relative}')
        original = target.read_bytes() if target.exists() else b''
        original_lines = original.decode('utf-8').splitlines(keepends=True)
        edits = []
        i += 1
        previous_end = 0
        while i < len(lines) and lines[i] != '@@END\n':
            fields = lines[i].strip().split()
            if len(fields) != 4 or fields[0] != '@@EDIT':
                raise SystemExit(f'Invalid edit header: {relative}')
            start, end, count = map(int, fields[1:])
            if not 0 <= previous_end <= start <= end <= len(original_lines) or count < 0:
                raise SystemExit(f'Overlapping or invalid edit: {relative}')
            payload = lines[i + 1:i + 1 + count]
            if len(payload) != count:
                raise SystemExit(f'Truncated edit: {relative}')
            edits.append((start, end, payload))
            previous_end = end
            i += 1 + count
        if i >= len(lines):
            raise SystemExit(f'Missing end: {relative}')
        i += 1
        for start, end, payload in reversed(edits):
            original_lines[start:end] = payload
        changes[relative] = ''.join(original_lines).encode('utf-8')
if len(changes) != 71:
    raise SystemExit(f'Expected 71 source files, received {len(changes)}')
manifest = ''.join(name + '\0' + hashlib.sha256(content).hexdigest() + '\n'
                   for name, content in sorted(changes.items()))
observed = hashlib.sha256(manifest.encode()).hexdigest()
if observed != expected:
    raise SystemExit(f'Final source digest mismatch: {observed}')
for name, content in sorted(changes.items()):
    target = root / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    print(hashlib.sha256(content).hexdigest(), name)
print(f'Verified {len(changes)} source files; aggregate SHA-256 {observed}')
