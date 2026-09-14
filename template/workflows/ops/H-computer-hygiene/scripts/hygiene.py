#!/usr/bin/env python3
"""Bounded, local-only computer hygiene audit. Python 3.10+, standard library.

Default audit does not spawn tools, evaluate profiles, change configuration, or
remove anything. Optional apply ONLY renames a small allowlist of caches into a
same-volume quarantine after explicit, hash-bound approval. No purge operation.
"""
from __future__ import annotations

import argparse
import contextlib
import ctypes
import datetime as dt
import hashlib
import html
import json
import os
import platform
import plistlib
import re
import shutil
import stat
import sys
import time
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

BASE = Path(__file__).resolve().parents[1]
CATALOG = json.loads((BASE / "rules" / "catalog.json").read_text(encoding="utf-8"))
SCHEMA = 1
VERSION = "1.0.0-candidate"
REPARSE = 0x400
OFFLINE = 0x1000
RECALL_ON_OPEN = 0x40000
RECALL_ON_DATA_ACCESS = 0x400000
PROTECTED = {n.casefold() for n in CATALOG["protected_names"]} | {".git"}
OPTIONS = {
    "schema_version": 1, "project_roots": [], "exclude_roots": [],
    "target_root": None, "max_entries_per_tree": 20000,
    "max_entries_total": 200000, "seconds_per_tree": 3.0,
    "seconds_total": 90.0, "project_depth": 3,
    "min_age_days": 14, "large_file_mib": 512,
}
MANUAL_CHECKS = [
    {"area": "maven", "risk": "R2", "instruction": "Linux/macOS 优先用 SDKMAN 管理 JDK 与 Maven（sdk current/home）；核实 settings.xml、-Dmaven.repo.local、IDE 与项目参数；本地仓库可能含未发布的 install 产物，先备份，不整体删除。", "reference": "20-toolchains.md#java-maven-gradle"},
    {"area": "node-pnpm", "risk": "R2", "instruction": "可信终端中核实 Node 管理器、npm cache/prefix 与 pnpm store path；按本地帮助选择原生命令，清理 store 前检查离线需求及正在运行的安装。", "reference": "20-toolchains.md#node-npm-pnpm"},
    {"area": "go-rust-uv", "risk": "R2", "instruction": "核实 go env、rustup toolchain list、uv 路径命令；保留 Cargo 配置/凭据/安装工具，不把 Cargo Home、.venv 或 SDK 当缓存。", "reference": "20-toolchains.md"},
    {"area": "repositories", "risk": "P", "instruction": "对已授权且可信的仓库检查提交、推送、分支、worktree、submodule 和 LFS；未完成前不得删除仓库、.git、vendor、锁文件或虚拟环境。", "reference": "22-repositories.md"},
    {"area": "software", "risk": "R3", "instruction": "先按精确应用身份使用官方卸载器，再单独确认用户数据与残留；共享运行库、驱动、服务、插件不能按名称推断可删。", "reference": "30-software-removal.md"},
    {"area": "system", "risk": "R3", "instruction": "仅通过对应系统参考文档使用原生存储管理功能；不直接删除系统组件、快照、容器卷、WSL 磁盘或云同步文件。", "reference": "10-windows.md / 11-macos.md / 12-linux.md"},
]


class SafetyError(RuntimeError):
    """An invariant failed; fail closed rather than guessing."""


def json_bytes(obj: Any) -> bytes:
    return (json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def now_local() -> dt.datetime:
    return dt.datetime.now().astimezone()


def load_json(path: Path, limit: int = 16 * 1024 * 1024) -> Any:
    if path.stat().st_size > limit:
        raise SafetyError(f"JSON exceeds size limit: {path}")
    return json.loads(path.read_text(encoding="utf-8-sig"))


def atomic_json(path: Path, obj: Any, *, exclusive: bool = False) -> None:
    data = json_bytes(obj)
    if exclusive:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        return
    if path.exists() and (is_linklike(path) or path.stat().st_nlink > 1):
        raise SafetyError("Refusing linked journal destination")
    temp = path.with_name(path.name + ".tmp-" + uuid.uuid4().hex)
    try:
        atomic_json(temp, obj, exclusive=True)
        os.replace(temp, path)
    finally:
        if temp.exists():
            temp.unlink()  # only this process's own temporary journal


def write_exclusive(path: Path, content: str) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)


def is_linklike(path: Path, st: os.stat_result | None = None) -> bool:
    try:
        st = st or path.lstat()
        return stat.S_ISLNK(st.st_mode) or bool(getattr(st, "st_file_attributes", 0) & REPARSE)
    except OSError:
        return False


def is_placeholder(st: os.stat_result) -> bool:
    return bool(getattr(st, "st_file_attributes", 0) & (OFFLINE | RECALL_ON_OPEN | RECALL_ON_DATA_ACCESS))


def within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def absolute(path: Path) -> Path:
    return Path(os.path.abspath(os.fspath(path)))  # lexical normalization; do not hide symlinks


def path_barrier(path: Path, *, protected: bool = True) -> str | None:
    path = absolute(path)
    if str(path).startswith(("//", "\\\\")):
        return "network/UNC path excluded"
    for p in [path, *path.parents]:
        if protected and p.name.casefold() in PROTECTED:
            return "protected/cloud/source-control path"
        try:
            st = p.lstat()
        except FileNotFoundError:
            continue
        except OSError as exc:
            return f"metadata unavailable: {type(exc).__name__}"
        if is_linklike(p, st):
            return "symlink/junction/reparse ancestor excluded"
        if is_placeholder(st):
            return "offline/cloud placeholder excluded"
    return None


def ensure_private_dir(path: Path) -> None:
    if path_barrier(path, protected=False):
        raise SafetyError(f"Unsafe output/state directory: {path}")
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Never chmod pre-existing user directories. Newly created files use 0600.
    if not path.is_dir():
        raise SafetyError("Output/state path is not a directory")


def expand_path(text: str, home: Path, environ: dict[str, str]) -> Path | None:
    text = text.strip().strip('"').strip("'")
    if not text or any(x in text for x in ("$(", "`", "\n", "\r", "\x00", ";", "|")):
        return None
    if text == "~":
        text = str(home)
    elif text.startswith(("~/", "~\\")):
        text = str(home) + text[1:]
    values = {**environ, "HOME": str(home), "USERPROFILE": str(home)}
    text = re.sub(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)|%([^%]+)%",
                  lambda m: values.get(next(g for g in m.groups() if g), m.group(0)), text)
    if "$" in text or re.search(r"%[^%]+%", text):
        return None
    p = Path(text)
    return absolute(p) if p.is_absolute() else None


def redact(value: Any, home: Path) -> Any:
    if isinstance(value, str):
        text = value.replace(str(home), "~")
        alt = str(home).replace("\\", "/")
        if alt != str(home):
            text = text.replace(alt, "~")
        return text
    if isinstance(value, dict):
        return {k: redact(v, home) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [redact(v, home) for v in value]
    return value


def host_id(home: Path, system: str | None = None) -> str:
    identity = f"{system or platform.system()}|{platform.node()}|{os.getuid() if hasattr(os, 'getuid') else os.environ.get('USERNAME', '')}|{absolute(home)}"
    return sha256(identity.encode())


def validate_options(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) - set(OPTIONS):
        raise SafetyError("Config must be an object containing only documented keys")
    result = {**OPTIONS, **value}
    if result["schema_version"] != 1:
        raise SafetyError("Unsupported config schema")
    for key in ("project_roots", "exclude_roots"):
        if not isinstance(result[key], list) or not all(isinstance(x, str) for x in result[key]):
            raise SafetyError(f"{key} must be an array of paths")
    for key in ("max_entries_per_tree", "max_entries_total", "project_depth", "min_age_days", "large_file_mib"):
        if type(result[key]) is not int or not 0 <= result[key] <= 2000000:
            raise SafetyError(f"Invalid integer option: {key}")
    if result["max_entries_per_tree"] < 1 or result["max_entries_total"] < 1:
        raise SafetyError("Entry budgets must be positive")
    if result["min_age_days"] < 1 or result["project_depth"] > 12:
        raise SafetyError("min_age_days must be >=1; project_depth must be <=12")
    for key in ("seconds_per_tree", "seconds_total"):
        if type(result[key]) not in (int, float) or not 0 < result[key] <= 3600:
            raise SafetyError(f"Invalid time budget: {key}")
    if result["target_root"] is not None and not isinstance(result["target_root"], str):
        raise SafetyError("target_root must be a path string or null")
    return result


class Budget:
    def __init__(self, options: dict[str, Any]):
        self.options = options
        self.started = time.monotonic()
        self.used = 0

    def exhausted(self) -> bool:
        return self.used >= self.options["max_entries_total"] or time.monotonic() - self.started > self.options["seconds_total"]


def snapshot(path: Path, budget: Budget, excludes: list[Path] | None = None) -> dict[str, Any]:
    """Metadata-only snapshot. No content hashing, symlink following or subprocesses.

    The digest detects metadata changes, not malicious content changes with preserved
    timestamps. It is a stale-plan guard, not an integrity/authenticity guarantee.
    """
    out: dict[str, Any] = dict(logical_bytes=0, allocated_bytes=0, files=0, directories=0,
                               entries=0, complete=True, skipped_links=0, skipped_hardlinks=0,
                               skipped_special=0, newest_mtime_ns=0, errors=[], large_files=[], _files={})
    records: list[str] = []
    excludes = excludes or []
    start = time.monotonic()
    block = path_barrier(path)
    if block:
        out.update(complete=False, errors=[block], digest=None)
        return out
    try:
        root_stat = path.lstat()
    except OSError as exc:
        out.update(complete=False, errors=[type(exc).__name__], digest=None)
        return out
    root_dev = root_stat.st_dev
    out["root_identity"] = [root_stat.st_dev, root_stat.st_ino, root_stat.st_mode]
    stack = [path]
    seen: set[tuple[int, int]] = set()
    while stack:
        if (budget.exhausted() or out["entries"] >= budget.options["max_entries_per_tree"]
                or time.monotonic() - start > budget.options["seconds_per_tree"]):
            out["complete"] = False
            out["errors"].append("scan budget exhausted; measured size is a lower bound")
            break
        p = stack.pop()
        if any(within(p, x) for x in excludes) or (p != path and p.name.casefold() in PROTECTED):
            out["complete"] = False
            out["skipped_special"] += 1
            continue
        try:
            st = p.lstat()
            out["entries"] += 1
            budget.used += 1
            if is_linklike(p, st):
                out["skipped_links"] += 1
                out["complete"] = False
                continue
            if is_placeholder(st) or st.st_dev != root_dev:
                out["skipped_special"] += 1
                out["complete"] = False
                continue
            rel = str(p.relative_to(path))
            out["newest_mtime_ns"] = max(out["newest_mtime_ns"], st.st_mtime_ns)
            records.append(f"{rel}\0{st.st_dev}\0{st.st_ino}\0{st.st_mode}\0{st.st_size}\0{st.st_mtime_ns}\0{st.st_nlink}")
            if stat.S_ISDIR(st.st_mode):
                out["directories"] += 1
                children = []
                # Bound directory materialization as well as the later traversal.
                remaining = min(budget.options["max_entries_per_tree"] - out["entries"],
                                budget.options["max_entries_total"] - budget.used)
                with os.scandir(p) as iterator:
                    for entry in iterator:
                        if len(children) >= remaining or time.monotonic() - start > budget.options["seconds_per_tree"]:
                            out["complete"] = False
                            out["errors"].append("directory listing truncated")
                            break
                        children.append(Path(entry.path))
                stack.extend(sorted(children, key=str, reverse=True))
            elif stat.S_ISREG(st.st_mode):
                out["files"] += 1
                if st.st_nlink > 1:
                    out["skipped_hardlinks"] += 1  # measured, but never eligible for quarantine
                key = (st.st_dev, st.st_ino)
                if key not in seen:
                    seen.add(key)
                    out["logical_bytes"] += st.st_size
                    allocated = getattr(st, "st_blocks", 0) * 512
                    out["allocated_bytes"] += allocated
                    out["_files"][f"{st.st_dev}:{st.st_ino}"] = [st.st_size, allocated]
                if st.st_size >= budget.options["large_file_mib"] * 1024 * 1024:
                    out["large_files"].append({"path": str(p), "logical_bytes": st.st_size})
            else:
                out["skipped_special"] += 1
                out["complete"] = False
        except OSError as exc:
            out["complete"] = False
            if len(out["errors"]) < 12:
                out["errors"].append(f"{p}: {type(exc).__name__}")
    out["large_files"] = sorted(out["large_files"], key=lambda x: -x["logical_bytes"])[:20]
    out["digest"] = sha256("\n".join(sorted(records)).encode("utf-8", errors="replace"))
    return out


def default_cache_allowlist(home: Path, system: str) -> dict[str, Path]:
    if system == "Windows":
        local = home / "AppData" / "Local"
        return {"npm-content-cache": local / "npm-cache" / "_cacache",
                "pip-cache": local / "pip" / "Cache", "go-build-cache": local / "go-build"}
    cache = home / "Library" / "Caches" if system == "Darwin" else home / ".cache"
    return {"npm-content-cache": home / ".npm" / "_cacache", "pip-cache": cache / "pip",
            "go-build-cache": cache / "go-build"}


def cache_signature(kind: str, path: Path) -> bool:
    """Conservative recognition, not a promise that cache contents are disposable."""
    try:
        names = {p.name for p in path.iterdir()}
    except OSError:
        return False
    if not names:
        return False
    if kind == "npm-content-cache":
        return bool(names & {"content-v2", "index-v5"}) and names <= {"content-v2", "index-v5", "tmp"}
    if kind == "pip-cache":
        return bool(names & {"http", "http-v2", "wheels"}) and names <= {"http", "http-v2", "wheels", "selfcheck"}
    if kind == "go-build-cache":
        return any(re.fullmatch(r"[0-9a-f]{2}", n) for n in names) and all(
            re.fullmatch(r"[0-9a-f]{2}", n) or n in {"README", "trim.txt"} for n in names)
    return False


def readable_text(path: Path, limit: int = 1024 * 1024) -> str | None:
    if path_barrier(path):
        return None
    try:
        if not path.is_file() or path.stat().st_size > limit:
            return None
        return path.read_text(encoding="utf-8-sig", errors="replace")
    except OSError:
        return None


class Auditor:
    def __init__(self, *, home: Path | None = None, system: str | None = None,
                 environ: dict[str, str] | None = None, options: dict[str, Any] | None = None,
                 label: str = "LOCAL_MACHINE_AUDIT", native_platform_reads: bool = True):
        self.home = absolute(home or Path.home()).resolve()
        self.system = system or platform.system()
        self.env = dict(os.environ if environ is None else environ)
        self.options = validate_options(options or {})
        self.label = label
        self.native_platform_reads = native_platform_reads
        self.started = now_local()
        self.scan_id = uuid.uuid4().hex[:12]
        self.budget = Budget(self.options)
        self.findings: list[dict[str, Any]] = []
        self.items: list[dict[str, Any]] = []
        self.actions: list[dict[str, Any]] = []
        self.seen_paths: set[str] = set()
        self.unique_files: dict[str, list[int]] = {}
        self.excludes = []
        for s in self.options["exclude_roots"]:
            p = expand_path(s, self.home, self.env)
            if p is None:
                raise SafetyError("exclude_roots requires explicit absolute paths")
            self.excludes.append(p)
        self.coverage: list[dict[str, str]] = []

    def finding(self, category: str, risk: str, title: str, evidence: Any, recommendation: str) -> None:
        self.findings.append({"id": f"F{len(self.findings)+1:04}", "category": category,
                              "risk": risk, "title": title, "evidence": evidence,
                              "recommendation": recommendation})

    def add_path(self, kind: str, path: Path, source: str, risk: str = "R2", note: str = "") -> None:
        path = absolute(path)
        key = os.path.normcase(str(path))
        if key in self.seen_paths:
            for item in self.items:
                if os.path.normcase(item["path"]) == key and source not in item["sources"]:
                    item["sources"].append(source)
                    return
        self.seen_paths.add(key)
        if any(within(path, ex) for ex in self.excludes):
            self.items.append(dict(kind=kind, path=str(path), sources=[source], risk="P", status="excluded", note=note))
            return
        block = path_barrier(path)
        if block:
            self.items.append(dict(kind=kind, path=str(path), sources=[source], risk="P", status="blocked", note=block))
            return
        try:
            exists = path.exists()
        except OSError:
            exists = False
        if not exists:
            self.items.append(dict(kind=kind, path=str(path), sources=[source], risk=risk, status="absent", note=note))
            return
        if path == self.home or path == Path(path.anchor) or not within(path, self.home):
            # External paths remain visible, but require explicit per-volume inspection.
            self.items.append(dict(kind=kind, path=str(path), sources=[source], risk="P", status="metadata-only",
                                   note="Home/root/external location: not recursively inspected; " + note))
            return
        tree = snapshot(path, self.budget, self.excludes)
        self.unique_files.update(tree.pop("_files"))
        item = dict(kind=kind, path=str(path), sources=[source], risk=risk,
                    status="measured" if tree["complete"] else "partial", tree=tree, note=note)
        self.items.append(item)
        allowed = default_cache_allowlist(self.home, self.system)
        if (kind in allowed and path == allowed[kind] and tree["complete"] and tree["files"] > 0
                and not tree["skipped_links"] and not tree["skipped_hardlinks"] and not tree["skipped_special"]
                and tree["newest_mtime_ns"] <= int((time.time() - self.options["min_age_days"] * 86400) * 1e9)
                and cache_signature(kind, path)):
            action_id = "Q-" + sha256(f"{kind}|{path}".encode())[:10]
            self.actions.append(dict(id=action_id, operation="quarantine", kind=kind, path=str(path),
                                     snapshot=tree, risk="R2", reason="Default-location recognized cache; metadata age threshold met. Not proof of inactivity.",
                                     close_tools_required=True, releases_space=False))
            item["quarantine_action"] = action_id

    def environment(self) -> dict[str, Any]:
        entries = []
        seen: dict[str, int] = {}
        delimiter = ";" if self.system == "Windows" else ":"
        for index, raw in enumerate(self.env.get("PATH", "").split(delimiter), 1):
            if not raw:
                entries.append({"index": index, "value": "(empty/current directory)", "status": "unsafe-empty"})
                self.finding("PATH", "R2", "PATH 含空项，可能隐式搜索当前目录", f"entry {index}", "审核持久化来源后移除空项；不要直接覆盖全部 PATH。")
                continue
            p = expand_path(raw, self.home, self.env)
            normalized = os.path.normcase(str(p)) if p else raw
            state = "unresolved" if p is None else ("exists" if p.is_dir() else "missing")
            item = dict(index=index, value=raw, expanded=str(p) if p else None, status=state,
                        linklike=bool(p and is_linklike(p)))
            if normalized in seen:
                item["duplicate_of"] = seen[normalized]
            else:
                seen[normalized] = index
            entries.append(item)
        for e in entries:
            if "duplicate_of" in e:
                self.finding("PATH", "R1", "PATH 字面重复项", e, "保留必要优先级，备份后只修改产生重复的配置来源。")
            if e["status"] == "missing":
                self.finding("PATH", "R1", "PATH 目录当前不存在", e, "排除未挂载磁盘、会话级 shims 与延迟创建路径后再移除。")
        commands = {}
        for family, names in CATALOG["tools"].items():
            for name in names:
                matches = []
                for e in entries:
                    if e["status"] != "exists":
                        continue
                    root = Path(e["expanded"])
                    for suffix in ([".exe", ".cmd", ".bat", ".com", ""] if self.system == "Windows" else [""]):
                        p = root / (name + suffix)
                        try:
                            if p.is_file() and (self.system == "Windows" or os.access(p, os.X_OK)):
                                text = str(p)
                                if text not in matches:
                                    matches.append(text)
                        except OSError:
                            pass
                commands[name] = {"family": family, "matches": matches, "selected_candidate": matches[0] if matches else None,
                                  "executed": False, "version": None,
                                  "certainty": "PATH file lookup only; aliases/functions/shim resolution not evaluated"}
                if len(matches) > 1:
                    self.finding("tool-resolution", "R2", f"{name} 有多个 PATH 命中", matches, "在可信终端核实实际版本和主用管理器；多个路径不等于冗余安装。")
        variables = {k: self.env[k] for k in CATALOG["path_variables"] if k in self.env}
        self.coverage.append(dict(area="environment", status="partial", detail="Process PATH and curated path variables inspected; no shell evaluation, tool execution or effective-version proof."))
        return {"path": entries, "variables": variables, "commands": commands}

    def configurations(self) -> list[dict[str, Any]]:
        profiles = [".profile", ".bashrc", ".bash_profile", ".zshrc", ".zprofile", ".zshenv",
                    ".config/fish/config.fish", ".config/powershell/Microsoft.PowerShell_profile.ps1",
                    "Documents/PowerShell/Microsoft.PowerShell_profile.ps1",
                    "Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1"]
        output = []
        names = [*CATALOG["path_variables"], "PATH"]
        pattern = re.compile(r"\b(" + "|".join(map(re.escape, names)) + r")\b")
        assignments: dict[str, list[dict[str, Any]]] = {}
        for rel in profiles:
            path = self.home / rel
            if not path.exists() and not path.is_symlink():
                continue
            text = readable_text(path)
            if text is None:
                output.append({"path": str(path), "status": "skipped", "reason": "linked, inaccessible, or oversized"})
                continue
            declarations = []
            for line_number, line in enumerate(text.splitlines(), 1):
                if line.lstrip().startswith("#"):
                    continue
                for name in sorted(set(pattern.findall(line))):
                    item = {"variable": name, "line": line_number, "value": "not recorded; no evaluation"}
                    declarations.append(item)
                    assignments.setdefault(name, []).append({"path": str(path), "line": line_number})
            output.append({"path": str(path), "status": "inspected", "declarations": declarations})
        for name, locations in assignments.items():
            if len(locations) > 1 and name != "PATH":
                self.finding("configuration", "R2", f"{name} 出现在多个 profile 位置", locations,
                             "只是静态出现记录，未证明重复赋值或加载顺序；人工核实生效 shell 后整合。")
        settings = self.home / ".m2" / "settings.xml"
        text = readable_text(settings)
        if text:
            try:
                root = ET.fromstring(text)
                local = next((x.text for x in root if x.tag.rsplit("}", 1)[-1] == "localRepository"), None)
                output.append({"path": str(settings), "status": "inspected", "localRepository": local,
                               "sensitive_sections_recorded": False})
                if local:
                    p = expand_path(local, self.home, self.env)
                    if p:
                        self.add_path("maven-local-repository", p, "settings.xml declaration, not effective configuration proof", "P",
                                      "May contain unpublished artifacts installed locally; never blanket-delete.")
            except ET.ParseError:
                output.append({"path": str(settings), "status": "parse-error"})
        npmrc = self.home / ".npmrc"
        text = readable_text(npmrc)
        if text:
            values = {}
            for line in text.splitlines():
                m = re.match(r"^\s*(cache|prefix|store-dir)\s*=\s*(.*?)\s*$", line)
                if m:
                    value = m.group(2)
                    p = expand_path(value, self.home, self.env)
                    values[m.group(1)] = str(p) if p else "unresolved literal; not evaluated"
                    if p:
                        self.add_path("configured-" + m.group(1), p, "user .npmrc declaration; project/CLI overrides not resolved", "R2")
            output.append({"path": str(npmrc), "status": "inspected", "allowed_path_keys": values, "tokens_recorded": False})
        for rel in (".cargo/config", ".cargo/config.toml", ".config/go/env", ".config/uv/uv.toml", ".config/mise/config.toml"):
            p = self.home / rel
            if p.exists():
                output.append({"path": str(p), "status": "metadata-only", "note": "Potential configuration/credentials; content not exported. Effective values require trusted native queries."})
        self.coverage.append(dict(area="configuration", status="partial", detail="Known profile anchors and allowlisted Maven/npm path fields; no credentials, includes, project overrides, or effective execution."))
        return output

    def tool_storage(self) -> None:
        h = self.home
        local = expand_path(self.env.get("LOCALAPPDATA", ""), h, self.env) or h / "AppData" / "Local"
        xcache = expand_path(self.env.get("XDG_CACHE_HOME", ""), h, self.env) or h / ".cache"
        cache = local if self.system == "Windows" else (h / "Library/Caches" if self.system == "Darwin" else xcache)
        defaults = [
            ("maven-local-repository", h / ".m2/repository", "P", "May contain unpublished local artifacts, not a pure cache."),
            ("gradle-home", h / ".gradle", "P", "Contains configuration, caches, wrapper distributions and possibly credentials."),
            ("cargo-home", h / ".cargo", "P", "Contains config, credentials, installed binaries, registry and Git stores."),
            ("rustup-home", h / ".rustup", "R2", "Installed toolchains; remove by exact toolchain through rustup after checking pins."),
            ("go-workspace", h / "go", "P", "Can contain source code and installed tools, not a disposable cache."),
            ("uv-cache", (local / "uv/cache") if self.system == "Windows" else cache / "uv", "R2", "Use native uv cache commands after version verification; no automated moves."),
            ("pnpm-store", (local / "pnpm/store") if self.system == "Windows" else (h / "Library/pnpm/store" if self.system == "Darwin" else h / ".local/share/pnpm/store"), "R2", "Version-dependent default hypothesis; use pnpm store path to establish actual location."),
            ("npm-home", (local / "npm-cache") if self.system == "Windows" else h / ".npm", "R2", "May contain logs and other state; only _cacache can qualify for quarantine."),
            ("nvm", h / ".nvm", "R2", "Version manager; includes per-version global packages."),
            ("volta", h / ".volta", "R2", "Version manager data; do not move without documented migration."),
            ("fnm", (local / "fnm") if self.system == "Windows" else h / ".local/share/fnm", "R2", "Default hypothesis, verify with configuration."),
            ("mise", (local / "mise") if self.system == "Windows" else h / ".local/share/mise", "R2", "Support and path semantics must be checked against installed version."),
            ("asdf", h / ".asdf", "R2", "May contain plugins, shims and installed runtimes."),
            ("sdkman", h / ".sdkman", "R2", "Linux/macOS/WSL JDK and Maven candidate root, not a cache; native Windows is not the default manager."),
            ("pyenv", h / ".pyenv", "R2", "Interpreters and virtualenvs may have absolute prefix references."),
            ("jdk-user", h / ".jdks", "R2", "Often IDE-managed; verify IDE ownership and project JDK pins."),
            ("bun", h / ".bun", "R2", "Runtime and package state; not a pure cache."),
            ("docker-user-state", h / ".docker", "P", "Configuration may include authentication and contexts; no content export or automated deletion."),
        ]
        for kind, p, risk, note in defaults:
            self.add_path(kind, p, "known default hypothesis; not proof of active use", risk, note)
        for kind, p in default_cache_allowlist(h, self.system).items():
            self.add_path(kind, p, "conservative default cache location", "R1", "Recreation may need network; metadata age does not prove disuse.")
        env_kinds = {"JAVA_HOME": "jdk-install", "JDK_HOME": "jdk-install", "MAVEN_HOME": "maven-install",
                     "M2_HOME": "maven-install", "GRADLE_USER_HOME": "gradle-home", "GOPATH": "go-workspace",
                     "GOMODCACHE": "go-module-cache", "GOCACHE": "go-build-cache", "GOROOT": "go-sdk",
                     "CARGO_HOME": "cargo-home", "RUSTUP_HOME": "rustup-home", "UV_CACHE_DIR": "uv-cache",
                     "UV_PYTHON_INSTALL_DIR": "uv-python", "UV_TOOL_DIR": "uv-tools", "UV_TOOL_BIN_DIR": "uv-tool-bin",
                     "PNPM_HOME": "pnpm-executable-home", "NVM_DIR": "nvm", "NVM_HOME": "nvm-windows",
                     "VOLTA_HOME": "volta", "FNM_DIR": "fnm", "MISE_DATA_DIR": "mise", "ASDF_DATA_DIR": "asdf",
                     "SDKMAN_DIR": "sdkman", "PYENV_ROOT": "pyenv", "PIP_CACHE_DIR": "pip-cache",
                     "npm_config_cache": "npm-cache-configured", "NPM_CONFIG_CACHE": "npm-cache-configured",
                     "SCCACHE_DIR": "sccache", "PIPX_HOME": "pipx", "VIRTUAL_ENV": "active-virtualenv", "CONDA_PREFIX": "active-conda"}
        for name, kind in env_kinds.items():
            if name not in self.env:
                continue
            values = self.env[name].split(";" if self.system == "Windows" else ":") if name == "GOPATH" else [self.env[name]]
            for value in values:
                p = expand_path(value, h, self.env)
                if p:
                    self.add_path(kind, p, f"process environment: {name}", "P" if kind in {"cargo-home", "go-workspace", "active-virtualenv", "active-conda"} else "R2")
                else:
                    self.finding("configuration", "R2", f"{name} 不是可安全解析的绝对路径", {"variable": name}, "不执行变量中的表达式；在可信 shell 中检查实际配置。")
        self.coverage.append(dict(area="storage", status="partial", detail="Known defaults and declared locations; per-tree/global budgets; no full-disk crawl; custom tool defaults may be missed."))

    def projects(self) -> list[dict[str, Any]]:
        roots = []
        for value in self.options["project_roots"]:
            p = expand_path(value, self.home, self.env)
            if p is None or p == self.home or p == Path(p.anchor):
                raise SafetyError("Project roots must be explicit absolute subdirectories, not home/filesystem roots")
            roots.append(p)
        if not roots:
            self.coverage.append(dict(area="projects", status="not-checked", detail="No project roots authorized. Add --project-root; source code is never a deletion candidate."))
            return []
        result = []
        visited = set()
        stack = [(p, 0) for p in roots]
        skip = set(CATALOG["project_artifacts"]) | {".git", ".speculo-hygiene", "reports"}
        while stack and not self.budget.exhausted():
            path, depth = stack.pop()
            if str(path) in visited:
                continue
            visited.add(str(path))
            block = path_barrier(path)
            if block or any(within(path, ex) for ex in self.excludes):
                self.finding("project-coverage", "P", "项目路径跳过", str(path), block or "explicit exclusion")
                continue
            try:
                if not path.is_dir():
                    continue
                children = []
                with os.scandir(path) as iterator:
                    for entry in iterator:
                        self.budget.used += 1
                        if self.budget.exhausted() or len(children) >= self.options["max_entries_per_tree"]:
                            break
                        children.append(Path(entry.path))
                names = {p.name for p in children}
                markers = sorted(names & set(CATALOG["project_markers"]))
                git_kind = "directory" if ".git" in names and (path / ".git").is_dir() else ("gitfile/worktree-or-submodule" if ".git" in names else None)
                if markers or git_kind:
                    node_locks = sorted(names & {"pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "bun.lockb"})
                    item = {"path": str(path), "markers": markers, "git": git_kind,
                            "git_state": "unknown; Git commands not executed", "artifacts": [], "declared_node_manager": None,
                            "version_pin_files": sorted(names & set(CATALOG["version_pin_files"]))}
                    package = readable_text(path / "package.json")
                    if package:
                        try:
                            parsed = json.loads(package)
                            pm = parsed.get("packageManager") if isinstance(parsed, dict) else None
                            if isinstance(pm, str) and re.fullmatch(r"[A-Za-z0-9@.+_/-]{1,160}", pm):
                                item["declared_node_manager"] = pm
                        except (ValueError, TypeError):
                            pass
                    relative_parts = path.relative_to(self.home).parts if within(path, self.home) else path.parts
                    if any(part.casefold() in {"downloads", "temp", "tmp", "caches", ".cache"} for part in relative_parts):
                        self.finding("project-location", "R2", "项目位于易被清理的位置", str(path), "先保全仓库状态与唯一数据，再规划项目根；位置不规范不等于允许删除。")
                    if len(node_locks) > 1:
                        self.finding("project", "R2", "同一项目有多个 Node 包管理锁文件", {"path": str(path), "locks": node_locks},
                                     "确认实际管理器、迁移期和 CI 约束；不自动删除任一锁文件。")
                    for name in CATALOG["project_artifacts"]:
                        if name in names:
                            target = path / name
                            self.add_path("project-artifact-" + name, target, "authorized project inventory", "R2",
                                          "Name is only a hint; may contain source, local-only data, editable installs or tracked outputs. Manual review only.")
                            item["artifacts"].append(str(target))
                    result.append(item)
                if depth < self.options["project_depth"]:
                    for child in children:
                        if child.name in skip or child.name.casefold() in PROTECTED or child.name.endswith(".app"):
                            continue
                        if child.is_dir() and not is_linklike(child):
                            stack.append((child, depth + 1))
            except OSError as exc:
                self.finding("project-coverage", "R0", "项目目录不可读取", str(path), type(exc).__name__)
        self.coverage.append(dict(area="projects", status="partial", detail=f"Authorized roots only; depth <= {self.options['project_depth']}; repository content/state/remote ownership not verified."))
        return result

    def platform_inventory(self) -> dict[str, Any]:
        apps: list[dict[str, Any]] = []
        startup: list[dict[str, Any]] = []
        persistent_env: list[dict[str, Any]] = []
        errors: list[str] = []
        if self.system == "Windows":
            try:
                if not self.native_platform_reads:
                    raise ImportError("native registry disabled for fixture")
                import winreg
                for hive_name, hive in (("HKCU", winreg.HKEY_CURRENT_USER), ("HKLM", winreg.HKEY_LOCAL_MACHINE)):
                    for view in (winreg.KEY_WOW64_64KEY, winreg.KEY_WOW64_32KEY):
                        try:
                            with winreg.OpenKey(hive, r"Software\Microsoft\Windows\CurrentVersion\Uninstall", 0, winreg.KEY_READ | view) as root:
                                for i in range(min(winreg.QueryInfoKey(root)[0], 4000)):
                                    if self.budget.exhausted():
                                        break
                                    self.budget.used += 1
                                    key_name = winreg.EnumKey(root, i)
                                    with winreg.OpenKey(root, key_name) as key:
                                        def get(name: str) -> Any:
                                            try:
                                                return winreg.QueryValueEx(key, name)[0]
                                            except OSError:
                                                return None
                                        name = get("DisplayName")
                                        if name:
                                            apps.append({"name": str(name), "version": get("DisplayVersion"),
                                                         "publisher": get("Publisher"), "install_location": get("InstallLocation"),
                                                         "identity": f"{hive_name}/Uninstall/{key_name}", "view": view,
                                                         "uninstall_command_present": bool(get("UninstallString")),
                                                         "system_component": bool(get("SystemComponent")),
                                                         "action": "manual identity/dependency/data review; no uninstaller executed"})
                        except OSError as exc:
                            errors.append(f"{hive_name} uninstall view {view}: {type(exc).__name__}")
                    try:
                        with winreg.OpenKey(hive, r"Software\Microsoft\Windows\CurrentVersion\Run") as key:
                            for i in range(min(winreg.QueryInfoKey(key)[1], 1000)):
                                name, _, _ = winreg.EnumValue(key, i)
                                startup.append({"kind": "registry-Run", "scope": hive_name, "name": name,
                                                "command": "not exported; not executed"})
                    except OSError as exc:
                        errors.append(f"{hive_name} Run: {type(exc).__name__}")
                env_locations = [(winreg.HKEY_CURRENT_USER, "HKCU", r"Environment"),
                                 (winreg.HKEY_LOCAL_MACHINE, "HKLM", r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment")]
                allowed = {x.casefold() for x in CATALOG["path_variables"]} | {"path"}
                for hive, name, subkey in env_locations:
                    try:
                        with winreg.OpenKey(hive, subkey) as key:
                            for i in range(min(winreg.QueryInfoKey(key)[1], 1000)):
                                variable, value, reg_type = winreg.EnumValue(key, i)
                                if variable.casefold() in allowed:
                                    persistent_env.append({"scope": name, "variable": variable, "value": value, "registry_type": reg_type})
                    except OSError as exc:
                        errors.append(f"{name} persistent environment: {type(exc).__name__}")
            except ImportError:
                errors.append("Windows registry unavailable on this execution host; no real Windows inventory performed")
            self.coverage.append(dict(area="applications/startup", status="partial", detail="Win32 uninstall keys, Run keys, curated persistent env; no Win32_Product, Store/Appx, services, scheduled tasks, drivers, WSL or other-user inventory."))
            local = expand_path(self.env.get("LOCALAPPDATA", ""), self.home, self.env) or self.home / "AppData/Local"
            for rel, kind in [("Temp", "user-temp"), ("CrashDumps", "user-crash-dumps"), ("Microsoft/Windows/WER", "user-error-reports")]:
                self.add_path(kind, local / rel, "Windows per-user known location", "R2", "Age/size alone is not permission to delete; native cleanup preferred.")
        elif self.system == "Darwin":
            app_roots = [self.home / "Applications"]
            if self.native_platform_reads:
                app_roots += [Path("/Applications"), Path("/System/Applications")]
            for root in app_roots:
                if path_barrier(root) or not root.is_dir():
                    continue
                pending = [(root, 0)]
                while pending and not self.budget.exhausted():
                    directory, depth = pending.pop()
                    try:
                        with os.scandir(directory) as iterator:
                            for n, entry in enumerate(iterator):
                                if n >= 4000 or self.budget.exhausted():
                                    break
                                self.budget.used += 1
                                p = Path(entry.path)
                                if path_barrier(p):
                                    continue
                                if p.suffix == ".app":
                                    info = p / "Contents/Info.plist"
                                    data: dict[str, Any] = {}
                                    try:
                                        if not path_barrier(info) and info.stat().st_size <= 1024 * 1024:
                                            parsed = plistlib.loads(info.read_bytes())
                                            data = parsed if isinstance(parsed, dict) else {}
                                    except (OSError, ValueError, plistlib.InvalidFileException):
                                        pass
                                    apps.append({"name": p.stem, "path": str(p),
                                                 "bundle_id": data.get("CFBundleIdentifier"),
                                                 "version": data.get("CFBundleShortVersionString"),
                                                 "system_component": within(p, Path("/System")),
                                                 "action": "manual installer/receipt/dependency/data review; no uninstall"})
                                elif depth < 1 and p.is_dir():
                                    pending.append((p, depth + 1))
                    except OSError as exc:
                        errors.append(f"{directory}: {type(exc).__name__}")
            launch_folders = [self.home / "Library/LaunchAgents"]
            if self.native_platform_reads:
                launch_folders += [Path("/Library/LaunchAgents"), Path("/Library/LaunchDaemons")]
            for folder in launch_folders:
                if path_barrier(folder) or not folder.is_dir():
                    continue
                try:
                    with os.scandir(folder) as iterator:
                        for n, entry in enumerate(iterator):
                            if n >= 2000 or self.budget.exhausted():
                                break
                            self.budget.used += 1
                            p = Path(entry.path)
                            if p.suffix != ".plist" or path_barrier(p) or p.stat().st_size > 1024 * 1024:
                                continue
                            try:
                                data = plistlib.loads(p.read_bytes())
                                if not isinstance(data, dict):
                                    continue
                                program = data.get("Program")
                                args = data.get("ProgramArguments")
                                if not program and isinstance(args, list) and args:
                                    program = args[0]
                                # Do not export arbitrary arguments, tokens or environment sections.
                                executable = program if isinstance(program, str) and program.startswith("/") else None
                                startup.append({"kind": "launchd-plist", "path": str(p), "label": data.get("Label"),
                                                "executable": executable, "executable_exists": Path(executable).exists() if executable else None,
                                                "loaded_state": "not queried"})
                            except (OSError, ValueError, plistlib.InvalidFileException) as exc:
                                errors.append(f"{p}: {type(exc).__name__}")
                except OSError as exc:
                    errors.append(f"{folder}: {type(exc).__name__}")
            for rel, kind in [("Library/Caches", "mac-user-caches"), ("Library/Logs", "mac-user-logs"),
                              ("Library/Saved Application State", "mac-saved-state")]:
                self.add_path(kind, self.home / rel, "macOS user location", "R2", "No blanket cleanup. App data, sessions and current processes require separate review.")
            self.coverage.append(dict(area="applications/startup", status="partial", detail="App bundles (depth 1), readable third-party launchd metadata; no live launchctl/SMAppService state, package receipts, system extensions, snapshots, or other users."))
        else:
            self.coverage.append(dict(area="applications/startup", status="not-checked", detail="Linux branch inventories developer paths only. Native package inventory/journal/container/systemd checks require explicit manual review."))
        identities = {}
        deduped = []
        seen = set()
        for app in apps:
            key = (app.get("identity", app.get("path")), str(app.get("version")), app.get("install_location"))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(app)
            name = app.get("bundle_id") or app["name"]
            identities.setdefault(str(name), []).append(app)
        for identity, group in identities.items():
            if len(group) > 1:
                self.finding("software", "R2", "同身份/同名软件存在多条记录", {"identity": identity, "records": group},
                             "可能是不同架构、版本、账户范围或注册表重复；确认依赖与使用者后，才决定卸载哪一个。")
        return {"applications": deduped, "startup": startup, "persistent_environment": persistent_env, "errors": errors[:100]}

    def loose_files(self) -> list[dict[str, Any]]:
        result = []
        # Only direct children, no content reads, no assumption that age means unused.
        root = self.home / "Downloads"
        if root.is_dir() and not path_barrier(root) and not any(within(root, x) for x in self.excludes):
            try:
                with os.scandir(root) as iterator:
                    for n, entry in enumerate(iterator):
                        if n >= 2000 or self.budget.exhausted():
                            break
                        self.budget.used += 1
                        p = Path(entry.path)
                        st = p.lstat()
                        if is_linklike(p, st) or is_placeholder(st) or not stat.S_ISREG(st.st_mode):
                            continue
                        if p.suffix.lower() in {".exe", ".msi", ".msix", ".dmg", ".pkg", ".iso", ".zip", ".7z", ".tar", ".gz"} or st.st_size >= self.options["large_file_mib"] * 1024 * 1024:
                            result.append({"path": str(p), "logical_bytes": st.st_size,
                                           "modified_at": dt.datetime.fromtimestamp(st.st_mtime).astimezone().isoformat(),
                                           "risk": "R2", "action": "manual ownership/backup/content review; not a deletion candidate"})
            except OSError as exc:
                self.finding("loose-files", "R0", "Downloads 元数据不可完整读取", str(root), type(exc).__name__)
        self.coverage.append(dict(area="loose-files/duplicates", status="partial", detail="Downloads direct-child installers/archives/large-file metadata only. No content hashes, full-disk duplicate proof, Documents/Desktop traversal or personal-data deletion."))
        return sorted(result, key=lambda x: -x["logical_bytes"])

    def run(self) -> tuple[dict[str, Any], dict[str, Any]]:
        environment = self.environment()
        configs = self.configurations()
        self.tool_storage()
        projects = self.projects()
        software = self.platform_inventory()
        loose = self.loose_files()
        usage = shutil.disk_usage(self.home)
        try:
            elevated = bool(ctypes.windll.shell32.IsUserAnAdmin()) if self.system == "Windows" and hasattr(ctypes, "windll") else bool(hasattr(os, "geteuid") and os.geteuid() == 0)
        except (OSError, AttributeError):
            elevated = None
        if elevated:
            self.finding("privilege", "R2", "当前进程具有提升权限", "elevated process", "常规检测应以普通用户运行；提权会改变 HOME、环境及误操作影响范围。")
        observed_bytes = sum(v[0] for v in self.unique_files.values())
        report = {
            "schema_version": SCHEMA, "tool_version": VERSION, "record_kind": self.label,
            "scan_id": self.scan_id, "started_at": self.started.isoformat(), "completed_at": now_local().isoformat(),
            "date": self.started.strftime("%Y-%m-%d"),
            "host": {"system": self.system, "release": platform.release(), "machine": platform.machine(),
                     "home": str(self.home), "elevated": elevated, "fingerprint": host_id(self.home, self.system),
                     "execution_context_signals": {"container_marker": Path("/.dockerenv").exists() or Path("/run/.containerenv").exists(),
                                                   "wsl_variable_present": bool(self.env.get("WSL_DISTRO_NAME")),
                                                   "ssh_session_variable_present": bool(self.env.get("SSH_CONNECTION"))},
                     "disk_total_bytes": usage.total, "disk_free_bytes": usage.free},
            "safety": {"default_read_only": True, "network_requests": 0, "subprocesses": 0,
                       "configuration_changes": 0, "deleted_files": 0, "quarantine_frees_space": False,
                       "report_is_sensitive": True, "web_sources_verified": False},
            "scope": {"coverage": self.coverage, "options": self.options, "entries_visited": self.budget.used,
                      "global_budget_exhausted": self.budget.exhausted(),
                      "limitations": ["No complete disk or effective-tool-version claim.",
                                      "Stat calls on an unrecognized remote filesystem may block; budgets are cooperative, not OS I/O deadlines.",
                                      "No universal detection of bind mounts, macOS firmlinks, APFS clones or same-device remote mappings.",
                                      "Metadata mtime is not last-use evidence; content-identical duplicates not proven.",
                                      "Current user's report does not cover other users, WSL guest systems or all external volumes."]},
            "summary": {"findings": len(self.findings), "observed_unique_logical_bytes": observed_bytes,
                        "automated_quarantine_candidates": len(self.actions), "automated_permanent_deletion_candidates": 0,
                        "immediately_reclaimable_bytes_proven": None,
                        "note": "Observed size is not reclaimable space. File IDs deduplicate measured hardlinks/overlaps; clones/compression/sparse/network identity remain uncertain."},
            "environment": environment, "configurations": configs, "storage": self.items,
            "projects": projects, "software": software, "loose_files": loose,
            "findings": self.findings, "manual_checks": MANUAL_CHECKS,
        }
        plan = {"schema_version": SCHEMA, "kind": "speculo-hygiene-quarantine-plan", "tool_version": VERSION,
                "created_at": self.started.isoformat(), "expires_at": (self.started + dt.timedelta(hours=24)).isoformat(),
                "host_fingerprint": host_id(self.home, self.system), "home": str(self.home), "system": self.system,
                "scan_id": self.scan_id, "snapshot_limits": {k: self.options[k] for k in ("max_entries_per_tree", "max_entries_total", "seconds_per_tree", "seconds_total", "min_age_days")},
                "actions": self.actions, "contains_absolute_local_paths": True,
                "warning": "Quarantine only. No permanent deletion. Does not free disk space. No arbitrary commands or paths accepted."}
        return report, plan


def size_text(value: int | None) -> str:
    if value is None:
        return "未知"
    number = float(value)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if number < 1024 or unit == "TiB":
            return f"{number:.2f} {unit}"
        number /= 1024
    return "未知"


def cell(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    text = re.sub(r"[\x00-\x08\x0b-\x1f\x7f\u202a-\u202e\u2066-\u2069]", "", str(value))
    text = html.escape(text, quote=False)
    text = re.sub(r"([\\`*_{}\[\]()!])", r"\\\1", text)
    return text.replace("|", "\\|").replace("\n", "<br>").replace("\r", "")


def table(headers: list[str], rows: list[list[Any]]) -> str:
    if not rows:
        return "没有记录；请结合覆盖范围判断是不存在还是未检查。\n"
    return "\n".join(["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"] +
                     ["| " + " | ".join(cell(v) for v in row) + " |" for row in rows]) + "\n"


def target_root(home: Path, system: str, env: dict[str, str], option: str | None) -> Path:
    if option:
        p = expand_path(option, home, env)
        if p is None or p == home or p == Path(p.anchor) or path_barrier(p):
            raise SafetyError("target_root must be an explicit safe non-root absolute directory")
        return p
    if system == "Windows":
        local = expand_path(env.get("LOCALAPPDATA", ""), home, env) or home / "AppData/Local"
        return local / "Dev"
    return home / ("Developer/.tooling" if system == "Darwin" else ".local/share/dev")


def render_environment(report: dict[str, Any], root: Path) -> str:
    home = Path(report["host"]["home"])
    rows = [
        ["JDK / JAVA_HOME", "Linux/macOS 由 SDKMAN current/default 解析；Windows 用已确认的原生管理器", "不把 JAVA_HOME 写死到待淘汰版本；不与 jenv/brew java/mise java 叠 current；IDE、CI、项目分别验证"],
        ["Maven 发行版", "Linux/macOS 用 SDKMAN maven candidate；仓库仍独立", "sdk 管 mvn 二进制；~/.m2/repository 或 localRepository 另册保全"],
        ["Maven localRepository", str(root / "data/maven/repository"), "保留 settings.xml 官方锚点；备份未发布的 install 产物；不假设 MAVEN_USER_HOME 对所有版本生效"],
        ["GRADLE_USER_HOME", str(root / "data/gradle"), "整体包含配置/缓存/凭据；先停止 daemon，备份再验证"],
        ["Node 版本管理器", "保留一个经确认的主用管理器", "nvm/fnm/volta/asdf/mise 不叠加争抢入口；原生 Windows 支持单独核实"],
        ["npm cache", str(root / "cache/npm"), "使用 npm 官方配置入口；不盲目设置全局 prefix；日志不等于纯缓存"],
        ["PNPM_HOME / pnpm store", str(root / "bin/pnpm") + " / " + str(root / "cache/pnpm-store"), "两个不同概念；store 路径用本地版本支持的配置设置，注意项目所在卷与硬链接"],
        ["GOPATH / GOBIN", str(root / "data/go") + " / " + str(root / "bin/go"), "GOPATH 可能是多路径并含源码；GOBIN 中有用户安装的工具"],
        ["GOCACHE / GOMODCACHE", str(root / "cache/go-build") + " / " + str(root / "cache/go-mod"), "清理影响离线构建；一般不设置 GOROOT；先检查 go env 和项目 toolchain"],
        ["CARGO_HOME / RUSTUP_HOME", str(root / "data/cargo") + " / " + str(root / "data/rustup"), "非纯缓存；保护 credentials、config、bin、toolchain override；不要整目录自动迁移"],
        ["UV_CACHE_DIR", str(root / "cache/uv"), "先以当前 uv 帮助确认变量支持与现有配置"],
        ["UV_PYTHON_INSTALL_DIR / UV_TOOL_DIR", str(root / "data/uv/python") + " / " + str(root / "data/uv/tools"), "解释器、工具环境与缓存分开；虚拟环境不保证可重定位"],
        ["UV_TOOL_BIN_DIR", str(root / "bin/uv"), "确认 shell PATH 与已安装工具入口；避免和 pipx/系统 Python 重名"],
        ["SDKMAN（Linux/macOS）", "保留 ~/.sdkman 或已设置的 SDKMAN_DIR", "用 sdk install/default 管理 java/maven；不剪切 candidates；安装 SDKMAN 须单独授权"],
        ["mise/asdf 等", str(root / "data") + " 下各自专属根", "仅建议；不要与 SDKMAN 同时争 Java；按已安装管理器的真实 OS/版本文档迁移"],
    ]
    evidence = report["environment"]["variables"]
    text = f"# {report['date']} 环境归一化方案\n\n"
    text += "**这是一份未执行的方案，不是已生效配置。** 先确认主用版本管理器与项目 pin；不得把统一目录理解成任意搬动所有 SDK。\n\n"
    text += f"建议 DevRoot：`{root}`。系统/安装器管理的内容仍留在系统规定的位置。路径可以统一规划，但不要通过联接/符号链接掩盖配置混乱。\n\n"
    text += "## 当前进程证据\n\n" + table(["变量", "当前声明"], [[k, v] for k, v in evidence.items()])
    text += "\n没有被记录的变量不等于工具未安装；未执行原生查询，无法确认 CLI、项目或 IDE 的最终优先级。\n\n"
    text += "## 建议映射\n\n" + table(["对象", "建议目标", "约束"], rows)
    text += "\n## 迁移顺序与验收\n\n"
    text += "先备份配置与安装清单，确认没有运行中的 IDE、daemon、构建或安装。逐个生态迁移，不同时改所有变量。缓存优先让工具在新路径重建；含本地状态的目录按官方迁移方法处理。虚拟环境与绝对路径 shim 通常应重建。\n\n"
    text += "先在新终端进行会话级验证，再修改单一持久化来源，最后重开终端、IDE 和构建任务验证。Windows 用户与机器 PATH 分开处理，禁止用 setx PATH 拼接覆盖；macOS 登录 shell、交互 shell、GUI 启动环境各自核实。\n\n"
    text += "逐一检查 Maven/JDK 构建、Node/pnpm 安装与离线依赖需求、Go 测试、Rust override 与 cargo 工具、uv 项目及 tool 入口。需要网络的验证单独确认；失败则恢复原配置和原解析入口。旧目录只有在全部验证通过、唯一数据已备份并再次获准后才进入清理计划。\n\n"
    text += "PATH 仅放必要的 bin/shims；不要加入缓存、库目录、整个 SDK 根或当前目录。项目级 pin、wrapper 与 lockfile 保留。详见 `references/20-toolchains.md` 和 `21-path-migration.md`。\n"
    return redact(text, home)


def render_report(report: dict[str, Any], plan: dict[str, Any]) -> str:
    r = redact(report, Path(report["host"]["home"]))
    p = redact(plan, Path(report["host"]["home"]))
    host = r["host"]
    text = f"# {r['date']} 电脑环境与清理检测报告\n\n"
    if r["record_kind"] != "LOCAL_MACHINE_AUDIT":
        text += f"**测试示例：{r['record_kind']}。数据来自隔离 fixture，不代表任何用户的真实电脑。**\n\n"
    text += f"运行 ID：`{r['scan_id']}`；开始：{r['started_at']}；完成：{r['completed_at']}。\n\n"
    text += "## 1. 结论与空间口径\n\n"
    text += f"系统：**{host['system']} / {host['machine']}**。本次发现 {r['summary']['findings']} 条待复核事项；可选隔离候选 {len(p['actions'])} 项，自动永久删除动作 **0** 项。检测没有启动包管理器、连接网络、卸载软件或修改环境配置。\n\n"
    text += f"Home 所在卷剩余：{size_text(host['disk_free_bytes'])} / {size_text(host['disk_total_bytes'])}。测量范围内按文件标识去重的逻辑大小：{size_text(r['summary']['observed_unique_logical_bytes'])}；这**不是可释放空间**。扫描不完整时是已观察下界；硬链接、克隆、压缩、稀疏文件及文件系统特性会影响实际释放量。\n\n"
    text += "**隔离只是同卷重命名，不释放磁盘空间。** 缓存重新生成可能需要网络，mtime 不等于最后使用时间；所有删除、迁移、卸载和系统改动仍需逐项授权。\n\n"
    text += "执行环境线索：" + cell(host.get("execution_context_signals", {})) + "。若在容器、SSH 主机或 WSL 中运行，报告针对该执行环境，不自动代表桌面宿主机。\n\n"
    text += "## 2. 覆盖范围与缺口\n\n" + table(["范围", "状态", "说明"], [[x["area"], x["status"], x["detail"]] for x in r["scope"]["coverage"]])
    text += f"\n已访问元数据条目：{r['scope']['entries_visited']}；全局预算耗尽：{r['scope']['global_budget_exhausted']}。不是全盘完整性证明。\n\n"
    for limitation in r["scope"]["limitations"]:
        text += f"{limitation}\n\n"
    text += "## 3. 优先处理清单\n\n" + table(["ID", "风险", "发现", "证据", "建议"], [[x["id"], x["risk"], x["title"], x["evidence"], x["recommendation"]] for x in r["findings"]])
    text += "\n风险：R0 观察；R1 缓存候选；R2 可能影响离线构建或应用；R3 系统/应用数据级；P 保护项。等级低不代表允许自动删除。\n\n"
    text += "## 4. PATH 与工具解析\n\n" + table(["序号", "当前项", "状态", "重复于"], [[x["index"], x["value"], x["status"], x.get("duplicate_of")] for x in r["environment"]["path"]])
    text += "\n" + table(["工具", "PATH 候选首项", "全部命中", "实际版本"], [[name, x["selected_candidate"], x["matches"], "未执行，未知"] for name, x in r["environment"]["commands"].items()])
    text += "\nPATH 查找不解析 shell alias/function、版本管理器 shim 内部逻辑或 IDE 环境；nvm 等函数型工具可能不会出现。\n\n"
    text += "## 5. 配置来源\n\n" + table(["路径", "状态", "允许记录的字段"], [[x["path"], x["status"], {k: v for k, v in x.items() if k not in {"path", "status"}}] for x in r["configurations"]])
    text += "\n当前进程的路径变量：\n\n" + table(["变量", "值"], [[k, v] for k, v in r["environment"]["variables"].items()])
    text += "\n持久化环境（Windows 可读范围）：\n\n" + table(["范围", "变量", "值"], [[x["scope"], x["variable"], x["value"]] for x in r["software"]["persistent_environment"]])
    text += "\n## 6. 工具链、依赖与缓存完整清单\n\n"
    text += table(["类型", "路径", "状态", "逻辑大小", "风险", "证据来源 / 说明"],
                  [[x["kind"], x["path"], x["status"], size_text(x.get("tree", {}).get("logical_bytes")), x["risk"], "; ".join(x["sources"]) + " — " + x.get("note", "")] for x in r["storage"]])
    incomplete = [[x["path"], x["tree"].get("errors"), x["tree"].get("skipped_links"), x["tree"].get("skipped_special")] for x in r["storage"] if "tree" in x and not x["tree"]["complete"]]
    text += "\n不完整测量与跳过：\n\n" + table(["路径", "错误/截断", "链接数", "特殊条目数"], incomplete)
    text += "\n## 7. 项目、仓库与构建产物\n\n" + table(["项目", "标记", "Git 类型 / 状态", "构建产物候选", "版本 pin / Node 声明"],
                  [[x["path"], x["markers"], str(x["git"]) + " / " + x["git_state"], x["artifacts"], {"packageManager": x["declared_node_manager"], "pin_files": x.get("version_pin_files", [])}] for x in r["projects"]])
    text += "\n目录名相同不证明仓库冗余；未验证 Git 的未提交/未推送内容、worktree、submodule、LFS 和分支。`build`、`dist`、`target` 或 `.venv` 可能含独有数据，不提供自动删除动作。\n\n"
    text += "## 8. 软件、启动项与卸载残留线索\n\n" + table(["应用", "版本", "身份/路径", "系统组件", "处理方式"],
                  [[x["name"], x.get("version"), x.get("identity", x.get("path")), x.get("system_component"), x["action"]] for x in r["software"]["applications"]])
    text += "\n" + table(["启动项类型", "记录"], [[x["kind"], x] for x in r["software"]["startup"]])
    text += "\n启动项或可执行文件缺失仅是残留线索，不证明可删除。软件冗余必须核实架构、插件、项目依赖、许可证和个人数据选择。\n\n"
    text += table(["平台读取缺口"], [[x] for x in r["software"]["errors"]])
    text += "\n## 9. 下载资料与大文件复核\n\n" + table(["文件", "逻辑大小", "修改时间", "处理"], [[x["path"], size_text(x["logical_bytes"]), x["modified_at"], x["action"]] for x in r["loose_files"]])
    text += "\n没有读取这些文件内容、计算重复文件哈希或证明安装包已不再需要。个人资料与备份默认保留。\n\n"
    text += "## 10. 可选隔离计划\n\n" + table(["动作 ID", "缓存", "路径", "逻辑大小", "释放空间"], [[x["id"], x["kind"], x["path"], size_text(x["snapshot"]["logical_bytes"]), "否"] for x in p["actions"]])
    text += "\n计划有效期 24 小时，绑定主机与元数据快照。仅支持默认位置中结构可识别的 npm 内容缓存、pip 缓存和 Go 构建缓存；自定义路径、链接、硬链接、占位文件、扫描不全或近期变化会排除。执行前必须关闭相关工具，并以用户选中的 ID 审批。\n\n"
    text += "## 11. 原生清理与彻底卸载：待确认步骤\n\n" + table(["类别", "风险", "执行前要求", "参考"], [[x["area"], x["risk"], x["instruction"], x["reference"]] for x in r["manual_checks"]])
    text += "\n系统分流：Windows → `10-windows.md`；macOS → `11-macos.md`；Linux → `12-linux.md`。容器、WSL 和系统快照不计入可自动清理空间。\n\n"
    text += "## 12. 环境归一化、验证与回滚\n\n"
    text += f"阅读同目录 `{r['date']}.environment.md`。该文件结合本机路径变量生成建议映射，不会修改 PATH 或持久化配置。按生态逐项验证，保留回滚副本；用户同意检测不等于同意迁移。\n\n"
    text += "隔离执行使用写前日志；恢复入口为 `hygiene.py restore`，若原路径已被工具重建会拒绝覆盖，需人工合并。真正永久删除后不能承诺自动回滚；备份、离线依赖和应用数据要在删除前另行确认。\n\n"
    text += "## 13. 证据、资料与隐私\n\n"
    text += "本报告事实来源为本次本地元数据、允许的配置字段和系统可读清单。官方核验入口见 `references/00-sources.md`；交付时未在线访问，不能当作已核实的最新命令支持。执行原生操作前须验证本机版本、帮助及供应商文档。\n\n"
    text += "Markdown/公开 JSON 把当前 home 替换为 `~`，但软件清单、目录名、其他账户路径及项目名称仍可能敏感，分享前需复核。`.plan.json` 和执行 receipt 含真实绝对路径，应只保存在本机私密目录。Windows 文件权限继承父目录 ACL；本脚本不声称设置了专用 DACL。\n"
    return text


def save_audit(auditor: Auditor, output: Path) -> dict[str, str]:
    report, plan = auditor.run()
    root = target_root(auditor.home, auditor.system, auditor.env, auditor.options["target_root"])
    date = report["date"]
    run_dir = absolute(output) / date / (auditor.started.strftime("%H%M%S") + "-" + auditor.scan_id)
    ensure_private_dir(run_dir)
    public = redact(report, auditor.home)
    public_bytes = json_bytes(public)
    plan["source_report_sha256"] = sha256(public_bytes)
    files = {"report": str(run_dir / f"{date}.md"), "json": str(run_dir / f"{date}.json"),
             "plan": str(run_dir / f"{date}.plan.json"), "environment": str(run_dir / f"{date}.environment.md")}
    atomic_json(Path(files["json"]), public, exclusive=True)
    atomic_json(Path(files["plan"]), plan, exclusive=True)
    write_exclusive(Path(files["report"]), render_report(report, plan))
    write_exclusive(Path(files["environment"]), render_environment(report, root))
    return files


def read_plan(path: Path, home: Path, system: str) -> tuple[dict[str, Any], str]:
    data = path.read_bytes()
    if len(data) > 16 * 1024 * 1024:
        raise SafetyError("Plan too large")
    plan = json.loads(data)
    required = {"schema_version", "kind", "tool_version", "created_at", "expires_at", "host_fingerprint",
                "home", "system", "scan_id", "snapshot_limits", "actions", "contains_absolute_local_paths", "warning"}
    if not isinstance(plan, dict) or not required <= set(plan) or set(plan) - required - {"source_report_sha256"}:
        raise SafetyError("Unsupported or incomplete plan structure")
    if (plan["schema_version"] != SCHEMA or plan["kind"] != "speculo-hygiene-quarantine-plan"
            or plan["tool_version"] != VERSION or plan["system"] != system
            or plan["home"] != str(home) or plan["host_fingerprint"] != host_id(home, system)):
        raise SafetyError("Plan version, host, system or home mismatch")
    try:
        created = dt.datetime.fromisoformat(plan["created_at"])
        expires = dt.datetime.fromisoformat(plan["expires_at"])
        current = now_local()
        if (created.tzinfo is None or expires.tzinfo is None or current > expires
                or created > current + dt.timedelta(minutes=5)
                or not dt.timedelta(0) < expires - created <= dt.timedelta(hours=24, seconds=1)):
            raise SafetyError("Plan expired, future-dated or invalid validity window")
    except (TypeError, ValueError) as exc:
        raise SafetyError("Invalid plan timestamps") from exc
    validate_options(plan["snapshot_limits"])
    if not isinstance(plan["actions"], list) or len(plan["actions"]) > 3:
        raise SafetyError("Invalid action count")
    allowed = default_cache_allowlist(home, system)
    seen = set()
    action_keys = {"id", "operation", "kind", "path", "snapshot", "risk", "reason", "close_tools_required", "releases_space"}
    for action in plan["actions"]:
        if not isinstance(action, dict) or set(action) != action_keys:
            raise SafetyError("Unexpected action fields; arbitrary commands are not accepted")
        kind = action["kind"]
        p = absolute(Path(action["path"]))
        expected_id = "Q-" + sha256(f"{kind}|{p}".encode())[:10]
        if (action["operation"] != "quarantine" or kind not in allowed or p != allowed[kind]
                or action["id"] != expected_id or action["id"] in seen
                or action["releases_space"] is not False or action["close_tools_required"] is not True):
            raise SafetyError("Action is not an allowlisted cache quarantine")
        seen.add(action["id"])
        tree = action["snapshot"]
        if (not isinstance(tree, dict) or not tree.get("complete") or not tree.get("files")
                or tree.get("skipped_links") or tree.get("skipped_hardlinks") or tree.get("skipped_special")
                or not re.fullmatch(r"[0-9a-f]{64}", str(tree.get("digest", "")))):
            raise SafetyError("Snapshot cannot safely qualify for quarantine")
    return plan, sha256(data)


def approve_plan(plan_path: Path, ids: list[str], output: Path, ack: str,
                 *, home: Path | None = None, system: str | None = None) -> dict[str, Any]:
    h = (home or Path.home()).resolve()
    system = system or platform.system()
    plan, digest = read_plan(plan_path, h, system)
    if ack != "I_REVIEWED_EACH_ID":
        raise SafetyError("Explicit per-item review acknowledgement required")
    allowed = {x["id"] for x in plan["actions"]}
    if not ids or len(set(ids)) != len(ids) or not set(ids) <= allowed:
        raise SafetyError("Select nonempty unique IDs present in the plan; no wildcard/all approval")
    approval = {"schema_version": SCHEMA, "kind": "speculo-hygiene-approval", "plan_sha256": digest,
                "host_fingerprint": host_id(h, system), "approved_ids": ids, "approved_at": now_local().isoformat(),
                "acknowledgement": ack, "permanent_deletion_approved": False}
    ensure_private_dir(absolute(output).parent)
    atomic_json(absolute(output), approval, exclusive=True)
    return {"approval": str(absolute(output)), "plan_sha256": digest,
            "apply_confirmation": "QUARANTINE-" + digest[:12],
            "note": "User must separately assert related tools are closed; quarantine does not free space."}


@contextlib.contextmanager
def operation_lock(home: Path):
    state = home / ".speculo-hygiene"
    ensure_private_dir(state)
    lock = state / "operation.lock"
    try:
        atomic_json(lock, {"pid": os.getpid(), "created_at": now_local().isoformat(), "host": host_id(home)}, exclusive=True)
    except FileExistsError as exc:
        raise SafetyError("Operation lock exists. Verify no active process before manually handling a stale lock; never auto-remove it.") from exc
    try:
        yield state
    finally:
        # Only our own lock; refusing a changed/linked lock is preferable to unlinking it.
        if lock.exists() and not is_linklike(lock):
            try:
                if load_json(lock).get("pid") == os.getpid():
                    lock.unlink()
            except (OSError, ValueError):
                pass


def fresh_snapshot(path: Path, limits: dict[str, Any]) -> dict[str, Any]:
    options = validate_options(limits)
    tree = snapshot(path, Budget(options))
    tree.pop("_files", None)
    return tree


def snapshots_match(current: dict[str, Any], old: dict[str, Any]) -> bool:
    return bool(current.get("complete") and current.get("digest") == old.get("digest")
                and current.get("root_identity") == old.get("root_identity")
                and not current.get("skipped_links") and not current.get("skipped_hardlinks")
                and not current.get("skipped_special"))


def apply_plan(plan_path: Path, approval_path: Path, confirmation: str, tools_closed: bool,
               *, home: Path | None = None, system: str | None = None) -> dict[str, Any]:
    h = (home or Path.home()).resolve()
    system = system or platform.system()
    plan, digest = read_plan(plan_path, h, system)
    approval = load_json(approval_path)
    expected = "QUARANTINE-" + digest[:12]
    if confirmation != expected or not tools_closed:
        raise SafetyError(f"Requires --confirm {expected} AND --tools-closed; no changes made")
    if (not isinstance(approval, dict) or approval.get("schema_version") != SCHEMA
            or approval.get("kind") != "speculo-hygiene-approval"
            or approval.get("plan_sha256") != digest or approval.get("host_fingerprint") != host_id(h, system)
            or approval.get("acknowledgement") != "I_REVIEWED_EACH_ID"
            or approval.get("permanent_deletion_approved") is not False):
        raise SafetyError("Approval does not match this exact plan and host")
    approved = approval.get("approved_ids")
    available = {a["id"] for a in plan["actions"]}
    if not isinstance(approved, list) or not approved or len(set(approved)) != len(approved) or not set(approved) <= available:
        raise SafetyError("Approval IDs invalid")
    actions = [a for a in plan["actions"] if a["id"] in approved]
    with operation_lock(h) as state:
        qroot = state / "quarantine"
        ensure_private_dir(qroot)
        run = qroot / (now_local().strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:12])
        run.mkdir(mode=0o700)
        receipt_path = run / "receipt.json"
        receipt = {"schema_version": SCHEMA, "kind": "speculo-hygiene-receipt", "host_fingerprint": host_id(h, system),
                   "home": str(h), "system": system, "plan_sha256": digest, "created_at": now_local().isoformat(),
                   "status": "prepared", "snapshot_limits": plan["snapshot_limits"], "actions": []}
        for action in actions:
            src = Path(action["path"])
            dst = run / (action["id"] + "-" + src.name)
            receipt["actions"].append({"id": action["id"], "kind": action["kind"], "source": str(src),
                                       "destination": str(dst), "snapshot": action["snapshot"], "status": "pending"})
        atomic_json(receipt_path, receipt, exclusive=True)
        try:
            # Preflight every approved item before the first rename, then recheck each immediately before use.
            for item in receipt["actions"]:
                src = Path(item["source"])
                if path_barrier(src) or not cache_signature(item["kind"], src):
                    raise SafetyError("Path blocked or cache structure changed: " + str(src))
                if src.stat().st_dev != run.stat().st_dev:
                    raise SafetyError("Cross-volume quarantine refused; no copy/delete fallback")
                current = fresh_snapshot(src, plan["snapshot_limits"])
                if not snapshots_match(current, item["snapshot"]):
                    raise SafetyError("Cache changed or scan incomplete; re-audit: " + str(src))
                age_limit = int((time.time() - plan["snapshot_limits"]["min_age_days"] * 86400) * 1e9)
                if current["newest_mtime_ns"] > age_limit:
                    raise SafetyError("Cache is too recent")
            for item in receipt["actions"]:
                src, dst = Path(item["source"]), Path(item["destination"])
                if path_barrier(src) or path_barrier(dst, protected=False) or dst.exists():
                    raise SafetyError("Path changed during execution")
                if not snapshots_match(fresh_snapshot(src, plan["snapshot_limits"]), item["snapshot"]):
                    raise SafetyError("Cache changed immediately before rename")
                item["status"] = "prepared"
                atomic_json(receipt_path, receipt)  # write-ahead: exact source/destination before mutation
                os.rename(src, dst)  # same volume, no recursive delete, no shell, no copy fallback
                item["status"] = "moved"
                atomic_json(receipt_path, receipt)
                if not snapshots_match(fresh_snapshot(dst, plan["snapshot_limits"]), item["snapshot"]):
                    item["status"] = "moved-with-drift"
                    raise SafetyError("Post-rename metadata drift. Preserve both locations and inspect receipt; no automatic overwrite/rollback.")
            receipt["status"] = "quarantined"
            atomic_json(receipt_path, receipt)
        except Exception as exc:
            receipt["status"] = "stopped-on-error"
            receipt["error"] = f"{type(exc).__name__}: {exc}"
            atomic_json(receipt_path, receipt)
            raise SafetyError(f"Stopped; previous moves remain recoverable. Receipt: {receipt_path}. {exc}") from exc
    return {"status": "quarantined", "receipt": str(receipt_path), "moved_items": len(actions),
            "freed_disk_space": False, "permanently_deleted_items": 0,
            "restore_preview": f"python hygiene.py restore --receipt \"{receipt_path}\""}


def restore_receipt(receipt_path: Path, confirmation: str | None,
                    *, home: Path | None = None, system: str | None = None) -> dict[str, Any]:
    h = (home or Path.home()).resolve()
    system = system or platform.system()
    receipt_path = absolute(receipt_path)
    expected_root = h / ".speculo-hygiene/quarantine"
    if (not within(receipt_path, expected_root) or receipt_path.name != "receipt.json"
            or len(receipt_path.relative_to(expected_root).parts) != 2
            or path_barrier(receipt_path, protected=False)):
        raise SafetyError("Receipt must be an unlinked file in this user's exact quarantine run directory")
    data = receipt_path.read_bytes()
    if len(data) > 16 * 1024 * 1024:
        raise SafetyError("Receipt too large")
    receipt = json.loads(data)
    if (not isinstance(receipt, dict) or receipt.get("schema_version") != SCHEMA
            or receipt.get("kind") != "speculo-hygiene-receipt" or receipt.get("home") != str(h)
            or receipt.get("system") != system or receipt.get("host_fingerprint") != host_id(h, system)):
        raise SafetyError("Invalid/cross-host receipt")
    limits = validate_options(receipt["snapshot_limits"])
    allowed = default_cache_allowlist(h, system)
    ids = set()
    for item in receipt.get("actions", []):
        kind = item["kind"]
        src, dst = Path(item["source"]), Path(item["destination"])
        identifier = "Q-" + sha256(f"{kind}|{src}".encode())[:10]
        if (kind not in allowed or src != allowed[kind] or item["id"] != identifier or identifier in ids
                or dst != receipt_path.parent / (identifier + "-" + src.name)):
            raise SafetyError("Receipt contains a non-allowlisted path")
        ids.add(identifier)
    if not ids or len(ids) > 3:
        raise SafetyError("Invalid receipt action count")
    token = "RESTORE-" + sha256(data)[:12]
    if confirmation is None:
        return {"status": "preview-only", "confirmation": token,
                "actions": [{k: a[k] for k in ("id", "source", "destination", "status")} for a in receipt["actions"]],
                "warning": "Restoration refuses to overwrite a recreated cache. Close tools; approval is separate from original quarantine."}
    if confirmation != token:
        raise SafetyError("Restore confirmation mismatch; preview current receipt again")
    with operation_lock(h):
        try:
            for item in reversed(receipt["actions"]):
                src, dst = Path(item["source"]), Path(item["destination"])
                if path_barrier(src) or path_barrier(dst, protected=False):
                    raise SafetyError("Restore path now blocked")
                source_exists, dest_exists = src.exists(), dst.exists()
                if source_exists and not dest_exists:
                    # Also reconciles a crash before rename or after a successful restore.
                    if not snapshots_match(fresh_snapshot(src, limits), item["snapshot"]):
                        raise SafetyError("Source-only location changed; cannot infer successful recovery")
                    item["status"] = "restored-or-not-moved"
                    atomic_json(receipt_path, receipt)
                    continue
                if source_exists or not dest_exists:
                    raise SafetyError("Source recreated or both paths missing; no overwrite/merge/delete is attempted")
                if not snapshots_match(fresh_snapshot(dst, limits), item["snapshot"]):
                    raise SafetyError("Quarantine contents changed; manual preservation/review required")
                if not src.parent.is_dir() or src.parent.stat().st_dev != dst.stat().st_dev:
                    raise SafetyError("Original parent missing or volume changed")
                item["status"] = "restore-prepared"
                atomic_json(receipt_path, receipt)
                os.rename(dst, src)
                item["status"] = "restored"
                atomic_json(receipt_path, receipt)
            receipt["status"] = "restored"
            atomic_json(receipt_path, receipt)
        except Exception as exc:
            receipt["status"] = "restore-stopped-on-error"
            receipt["restore_error"] = f"{type(exc).__name__}: {exc}"
            atomic_json(receipt_path, receipt)
            raise SafetyError(f"Restore stopped; preserve source, quarantine and receipt. {exc}") from exc
    return {"status": "restored", "receipt": str(receipt_path), "permanently_deleted_items": 0}


def cli(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", action="version", version=VERSION)
    sub = parser.add_subparsers(dest="command", required=True)
    audit = sub.add_parser("audit", help="Read-only local audit; creates reports only")
    audit.add_argument("--config", type=Path)
    audit.add_argument("--output", type=Path, default=Path.cwd() / "reports")
    audit.add_argument("--project-root", action="append", default=[], help="Explicit project root; repeatable; no home/disk roots")
    audit.add_argument("--target-root", help="Proposed DevRoot only; not created or activated")
    review = sub.add_parser("review", help="Print exact plan hash and selectable quarantine IDs")
    review.add_argument("--plan", required=True, type=Path)
    approve = sub.add_parser("approve", help="Write approval for user-selected IDs, not all findings")
    approve.add_argument("--plan", required=True, type=Path)
    approve.add_argument("--ids", required=True, nargs="+")
    approve.add_argument("--output", required=True, type=Path)
    approve.add_argument("--ack", required=True, choices=["I_REVIEWED_EACH_ID"])
    apply = sub.add_parser("apply", help="Optional same-volume quarantine only; no space freed")
    apply.add_argument("--plan", required=True, type=Path)
    apply.add_argument("--approval", required=True, type=Path)
    apply.add_argument("--confirm", required=True)
    apply.add_argument("--tools-closed", action="store_true", help="User assertion, not process inactivity proof")
    restore = sub.add_parser("restore", help="Preview recovery by default; explicit hash confirmation performs rename")
    restore.add_argument("--receipt", required=True, type=Path)
    restore.add_argument("--confirm")
    args = parser.parse_args(argv)
    try:
        if sys.version_info < (3, 10):
            raise SafetyError("Python 3.10 or newer required; this tool never installs Python")
        if args.command == "audit":
            options = validate_options(load_json(args.config) if args.config else {})
            options["project_roots"] = list(options["project_roots"]) + args.project_root
            if args.target_root:
                options["target_root"] = args.target_root
            result = save_audit(Auditor(options=options), args.output)
        elif args.command == "review":
            plan, digest = read_plan(args.plan, Path.home().resolve(), platform.system())
            result = {"plan_sha256": digest, "expires_at": plan["expires_at"],
                      "actions": [{k: a[k] for k in ("id", "kind", "path", "risk", "releases_space")} for a in plan["actions"]],
                      "confirmation_after_user_approval": "QUARANTINE-" + digest[:12]}
        elif args.command == "approve":
            result = approve_plan(args.plan, args.ids, args.output, args.ack)
        elif args.command == "apply":
            result = apply_plan(args.plan, args.approval, args.confirm, args.tools_closed)
        else:
            result = restore_receipt(args.receipt, args.confirm)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (SafetyError, OSError, ValueError, TypeError, KeyError) as exc:
        print(json.dumps({"status": "refused-or-incomplete", "error": f"{type(exc).__name__}: {exc}"}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(cli())
