"""OPS resource runtime primitives. Python >=3.10, standard library only."""
from __future__ import annotations
import contextlib, datetime as dt, hashlib, json, os, re, socket, stat, subprocess, tempfile, uuid
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any, Iterator

VERSION = "2.2.0"
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SECRET_RE = re.compile(r"\{\{credential:([a-z0-9-]+)@([1-9][0-9]*):([A-Za-z_][A-Za-z0-9_]*)\}\}")
class OpsError(Exception):
    """A blocked operation; callers must not turn this into success."""
class UnknownResult(OpsError):
    """Transport interruption: probe target receipts before retrying."""

def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

def canonical(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()

def digest(value: Any) -> str:
    return hashlib.sha256(value if isinstance(value, bytes) else canonical(value)).hexdigest()

def new_id(prefix: str) -> str:
    return f"{prefix}-{dt.datetime.now(dt.timezone.utc):%Y%m%d%H%M%S}-{uuid.uuid4().hex[:8]}"

def identifier(value: str, label: str = "id") -> str:
    if not isinstance(value, str) or not ID_RE.fullmatch(value) or len(value) > 80:
        raise OpsError(f"{label}: expected lowercase kebab id (1..80 characters)")
    if re.fullmatch(r"(?:con|prn|aux|nul|com[0-9]|lpt[0-9])", value):
        raise OpsError(f"{label}: Windows reserved name")
    return value

def exact(value: dict, allowed: set[str], required: set[str], label: str) -> None:
    if not isinstance(value, dict):
        raise OpsError(f"{label}: expected object")
    if set(value) - allowed:
        raise OpsError(f"{label}: unknown fields: {sorted(set(value)-allowed)}")
    if required - set(value):
        raise OpsError(f"{label}: missing fields: {sorted(required-set(value))}")

def relative(value: str) -> str:
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value or ":" in value:
        raise OpsError(f"unsafe relative path: {value!r}")
    if value.startswith("/") or any(x in ("", ".", "..") for x in value.split("/")):
        raise OpsError(f"unsafe relative path: {value!r}")
    return value

def root_path(value: str, platform: str) -> str:
    cls = PureWindowsPath if platform == "windows" else PurePosixPath
    p = cls(value)
    if not p.is_absolute() or ".." in p.parts or "\x00" in value:
        raise OpsError("host root must be an absolute, non-traversing path")
    if platform == "windows":
        if str(p).startswith("\\\\") or len(p.parts) < 2 or any(":" in x for x in p.parts[1:]):
            raise OpsError("UNC, drive root and ADS paths are not host roots")
        if str(p).lower().rstrip("\\") in {r"c:\windows", r"c:\program files", r"c:\users", r"c:\programdata"}:
            raise OpsError("a system directory cannot be host_root")
    elif str(p) in {"/", "/etc", "/usr", "/var", "/home", "/root", "/tmp", "/srv", "/opt", "/mnt"}:
        raise OpsError("host_root must be an OPS-specific child directory")
    return str(p)

def target_join(host: dict, *parts: str) -> str:
    cls = PureWindowsPath if host["platform"] == "windows" else PurePosixPath
    p = cls(host["root"])
    for part in parts:
        p = p.joinpath(*relative(part).split("/"))
    return str(p)

def within(path: str, root: str, platform: str) -> bool:
    cls = PureWindowsPath if platform == "windows" else PurePosixPath
    p, r = cls(path), cls(root)
    if ".." in p.parts or not p.is_absolute():
        return False
    try:
        p.relative_to(r)
        return p != r
    except ValueError:
        return False

def no_symlinks(path: Path, *, allow_missing: bool = True) -> None:
    p = path.absolute()
    for q in [*reversed(p.parents), p]:
        try:
            s = q.lstat()
        except FileNotFoundError:
            if allow_missing:
                continue
            raise OpsError(f"missing path: {q}")
        if stat.S_ISLNK(s.st_mode) or getattr(s, "st_file_attributes", 0) & 0x400:
            raise OpsError(f"symlink/reparse point rejected: {q}")

def secure(path: Path, directory: bool = False) -> None:
    """No chmod-only security claim on Windows; use a protected explicit ACL."""
    if os.name != "nt":
        os.chmod(path, 0o700 if directory else 0o600)
        return
    who = subprocess.run(["whoami", "/user", "/fo", "csv", "/nh"], capture_output=True, text=True, check=True)
    import csv
    sid = next(csv.reader([who.stdout.strip()]))[1]
    flags = "(OI)(CI)F" if directory else "F"
    subprocess.run(["icacls", str(path), "/inheritance:r", "/grant:r", f"*{sid}:{flags}", "*S-1-5-18:F"],
                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)

def private_dir(path: Path) -> None:
    no_symlinks(path)
    missing = []
    p = path
    while not p.exists():
        missing.append(p); p = p.parent
    for p in reversed(missing):
        p.mkdir(mode=0o700)
        secure(p, True)
    secure(path, True)

def atomic_write(path: Path, data: bytes | str, mode: int = 0o600, *, exclusive: bool = False) -> None:
    if isinstance(data, str):
        data = data.encode("utf-8")
    no_symlinks(path)
    private_dir(path.parent)
    if exclusive and path.exists():
        raise OpsError(f"immutable artifact already exists: {path}")
    fd, name = tempfile.mkstemp(prefix=".ops-write-", dir=path.parent)
    tmp = Path(name)
    try:
        os.fchmod(fd, mode) if hasattr(os, "fchmod") else None
        with os.fdopen(fd, "wb") as handle:
            handle.write(data); handle.flush(); os.fsync(handle.fileno())
        if os.name == "nt": secure(tmp)
        if exclusive:
            # Link is an atomic create-if-absent on the same filesystem.
            os.link(tmp, path)
            tmp.unlink()
        else:
            os.replace(tmp, path)
        if os.name != "nt": os.chmod(path, mode)
        if hasattr(os, "O_DIRECTORY"):
            d = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try: os.fsync(d)
            finally: os.close(d)
    finally:
        tmp.unlink(missing_ok=True)

def write_json(path: Path, value: Any, *, exclusive: bool = False) -> None:
    atomic_write(path, json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", exclusive=exclusive)

def read_json(path: Path) -> Any:
    no_symlinks(path, allow_missing=False)
    try:
        def pairs(items):
            obj = {}
            for k, v in items:
                if k in obj: raise ValueError("duplicate JSON key: " + k)
                obj[k] = v
            return obj
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=pairs,
                          parse_constant=lambda v: (_ for _ in ()).throw(ValueError(v)))
    except (ValueError, OSError) as exc:
        raise OpsError(f"invalid JSON: {path}: {exc}") from exc

@contextlib.contextmanager
def lock(path: Path, owner: dict) -> Iterator[None]:
    private_dir(path.parent)
    try: path.mkdir(mode=0o700)
    except FileExistsError as exc: raise OpsError(f"lock-held: {path}; inspect owner, never auto-break") from exc
    write_json(path / "owner.json", {**owner, "pid": os.getpid(), "machine": socket.gethostname(), "at": now()})
    try:
        yield
    finally:
        (path / "owner.json").unlink(missing_ok=True)
        path.rmdir()

def redact(text: str, secrets: list[str]) -> str:
    for value in sorted(set(secrets), key=len, reverse=True):
        if value: text = text.replace(value, "[REDACTED]")
    text = re.sub(r"(?i)(password|passwd|token|secret|access_key)(\s*[=:]\s*)[^\s,;]+", r"\1\2[REDACTED]", text)
    return text

def credentials_in(value: Any) -> set[str]:
    return {f"{m[0]}@{m[1]}" for m in SECRET_RE.findall(json.dumps(value, ensure_ascii=False))}

def resolve_secrets(value: Any, ledger: dict) -> Any:
    if isinstance(value, str):
        def sub(match):
            cid, version, field = match.groups()
            try: result = ledger["entries"][cid][version]["values"][field]
            except KeyError as exc: raise OpsError(f"missing credential: {cid}@{version}:{field}") from exc
            if not isinstance(result, str): raise OpsError("credential values must be strings")
            return result
        return SECRET_RE.sub(sub, value)
    if isinstance(value, list): return [resolve_secrets(v, ledger) for v in value]
    if isinstance(value, dict): return {k: resolve_secrets(v, ledger) for k, v in value.items()}
    return value

def empty_status() -> dict:
    return {"schema_version": 3, "workflow": "ops", "revision": 0, "controller": None,
            "hosts": {}, "projects": {}, "deployments": {}, "allocations": {}, "bindings": {}, "releases": {},
            "policies": {"server_readme_credentials": False, "server_operations": True,
                         "strict_docker_root": True}, "updated_at": None}
