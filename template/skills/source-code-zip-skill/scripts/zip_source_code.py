#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""将源码目录打包为 ZIP，并通过正则规则排除依赖、构建产物、秘密文件和非代码文件。

首选运行方式：
    uv run zip_source_code.py /path/to/project

本脚本仅使用 Python 标准库，不需要安装第三方依赖。
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Pattern, Sequence

__version__ = "1.0.0"

# ---------------------------------------------------------------------------
# 可编辑配置
# ---------------------------------------------------------------------------
# IGNORE 是默认忽略字段。每一项都是正则表达式，匹配对象是：
#   1. 相对于待压缩目录的路径；
#   2. 路径分隔符统一为 "/"；
#   3. 路径开头没有 "/"；
#   4. 正则匹配默认不区分大小写，并使用 re.search。
#
# 示例：
#   r"(^|/)node_modules(?:/|$)"   -> 忽略任意层级的 node_modules 目录
#   r"\.zip$"                     -> 忽略所有 .zip 文件
#   r"(^|/)private/"              -> 忽略任意层级名为 private 的目录
IGNORE: list[str] = [
    # 版本控制、编辑器和系统元数据
    r"(^|/)\.(?:git|hg|svn)(?:/|$)",
    r"(^|/)(?:\.idea|\.vscode)(?:/|$)",
    r"(^|/)(?:\.DS_Store|Thumbs\.db|desktop\.ini)$",

    # 依赖目录、虚拟环境和缓存
    r"(^|/)(?:node_modules?|bower_components|jspm_packages|vendor|Pods|Carthage)(?:/|$)",
    r"(^|/)(?:\.venv|venv|env|__pycache__|\.pytest_cache|\.mypy_cache|\.ruff_cache|\.tox|\.nox|\.cache)(?:/|$)",

    # 构建产物、覆盖率和框架缓存
    r"(^|/)(?:dist|build|target|out|coverage|htmlcov|\.next|\.nuxt|\.svelte-kit|\.parcel-cache|\.turbo|\.gradle)(?:/|$)",
    r"\.(?:min|bundle)\.(?:js|css)$",

    # 环境变量、证书、密钥和常见凭据文件
    r"(^|/)\.env(?:\..*)?$",
    r"(^|/)(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:\.pub)?$",
    r"\.(?:pem|key|p12|pfx|jks|keystore|crt|cer|der)$",

    # 用户明确要求排除 YAML
    r"\.ya?ml$",

    # 压缩包、归档和编译产物
    r"\.(?:zip|7z|rar|tar|tgz|tbz2?|txz|gz|bz2|xz|zst|jar|war|ear|whl|egg)$",
    r"\.(?:exe|dll|so(?:\.\d+)*|dylib|bin|o|obj|a|lib|class|py[co]|pyd|wasm)$",

    # 媒体、办公文档、数据库、日志和临时文件
    r"\.(?:png|jpe?g|gif|webp|bmp|tiff?|ico|heic|avif|mp[34]|m4[av]|wav|flac|ogg|mov|avi|mkv|webm)$",
    r"\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp)$",
    r"\.(?:sqlite3?|db|dump|log|tmp|temp|swp|swo|bak|old)$",

    # 锁文件通常不是源代码；pnpm-lock.yaml 同时也会被 YAML 规则匹配
    r"(^|/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.ya?ml|poetry\.lock|uv\.lock|Pipfile\.lock|composer\.lock|Gemfile\.lock)$",
]

# 默认“仅源码”模式允许的扩展名。扩展名统一使用小写并包含前导点。
CODE_EXTENSIONS: set[str] = {
    # Python / JavaScript / TypeScript
    ".py", ".pyi", ".pyx", ".pxd", ".pxi",
    ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx",

    # Web / UI
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".vue", ".svelte", ".astro", ".mdx",

    # JVM / Android
    ".java", ".kt", ".kts", ".scala", ".groovy", ".gradle",

    # Native / systems
    ".c", ".h", ".cc", ".cpp", ".cxx", ".hpp", ".hxx",
    ".m", ".mm", ".swift", ".rs", ".go", ".zig", ".nim",
    ".asm", ".s", ".v", ".sv", ".svh", ".vhd", ".vhdl",

    # .NET
    ".cs", ".fs", ".fsx", ".fsi", ".vb",

    # 脚本和命令行
    ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
    ".rb", ".php", ".pl", ".pm", ".lua", ".tcl",

    # 函数式语言和其他语言
    ".ex", ".exs", ".erl", ".hrl", ".clj", ".cljs", ".cljc",
    ".hs", ".lhs", ".ml", ".mli", ".r", ".jl", ".cr",
    ".dart", ".sol", ".move",

    # 数据库、接口描述和基础设施即代码
    ".sql", ".proto", ".graphql", ".gql", ".thrift",
    ".tf", ".hcl", ".nix",

    # 构建脚本和模板源码
    ".cmake", ".mk", ".mak", ".mustache", ".hbs", ".ejs",
    ".jinja", ".jinja2", ".j2", ".twig", ".tex",
}

# 无扩展名或特殊命名的常见源码/构建脚本。比较时不区分大小写。
CODE_FILENAMES: set[str] = {
    "dockerfile",
    "containerfile",
    "makefile",
    "gnumakefile",
    "cmakelists.txt",
    "jenkinsfile",
    "vagrantfile",
    "rakefile",
    "gemfile",
    "procfile",
    "justfile",
    "meson.build",
    "meson_options.txt",
    "build",
    "workspace",
    "build.bazel",
    "workspace.bazel",
    "module.bazel",
}


class ZipSourceError(Exception):
    """可展示给终端用户的错误。"""


@dataclass(frozen=True)
class Candidate:
    absolute_path: Path
    relative_path: Path
    size: int


@dataclass
class ScanStats:
    included: int = 0
    included_bytes: int = 0
    ignored: int = 0
    non_code: int = 0
    symlinks: int = 0
    output_file: int = 0


@dataclass(frozen=True)
class RegexRule:
    source: str
    compiled: Pattern[str]


def human_size(size: int) -> str:
    """把字节数格式化为易读字符串。"""
    units = ("B", "KiB", "MiB", "GiB", "TiB")
    value = float(size)
    for unit in units:
        if value < 1024.0 or unit == units[-1]:
            if unit == "B":
                return f"{int(value)} {unit}"
            return f"{value:.2f} {unit}"
        value /= 1024.0
    return f"{size} B"


def normalized_relative(path: Path) -> str:
    """返回用于正则匹配的 POSIX 风格相对路径。"""
    return path.as_posix()


def compile_rules(patterns: Iterable[str], label: str) -> list[RegexRule]:
    rules: list[RegexRule] = []
    for pattern in patterns:
        try:
            compiled = re.compile(pattern, re.IGNORECASE)
        except re.error as exc:
            raise ZipSourceError(f"{label} 中存在无效正则 {pattern!r}: {exc}") from exc
        rules.append(RegexRule(source=pattern, compiled=compiled))
    return rules


def first_match(rules: Sequence[RegexRule], relative_path: str) -> RegexRule | None:
    for rule in rules:
        if rule.compiled.search(relative_path):
            return rule
    return None


def load_regex_file(path: Path) -> list[str]:
    """读取“每行一个正则”的忽略文件；空行和以 # 开头的行会被忽略。"""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ZipSourceError(f"无法读取忽略规则文件 {path}: {exc}") from exc

    patterns: list[str] = []
    for line_number, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            re.compile(line, re.IGNORECASE)
        except re.error as exc:
            raise ZipSourceError(
                f"忽略规则文件 {path} 第 {line_number} 行正则无效: {exc}"
            ) from exc
        patterns.append(line)
    return patterns


def has_shebang(path: Path) -> bool:
    """无扩展名文件若以 shebang 开头，也视为源码脚本。"""
    if path.suffix:
        return False
    try:
        with path.open("rb") as file_obj:
            return file_obj.read(2) == b"#!"
    except OSError:
        # 后续 stat/压缩阶段会给出更明确的错误；这里仅返回非源码。
        return False


def is_code_file(path: Path) -> bool:
    name = path.name.lower()
    if name in CODE_FILENAMES:
        return True
    if path.suffix.lower() in CODE_EXTENSIONS:
        return True
    return has_shebang(path)


def archive_root_name(source: Path) -> str:
    """生成 ZIP 内部的顶层目录名。"""
    if source.name:
        return source.name
    anchor = source.anchor.replace(":", "").strip("/\\")
    return anchor or "root"


def default_output_path(source: Path) -> Path:
    name = archive_root_name(source)
    return source.parent / f"{name}.code.zip"


def normalize_output_path(path: Path) -> Path:
    expanded = path.expanduser()
    if expanded.suffix.lower() != ".zip":
        expanded = expanded.with_name(expanded.name + ".zip")
    return expanded.resolve(strict=False)


def log_skip(verbose: bool, relative_path: str, reason: str) -> None:
    if verbose:
        print(f"[跳过:{reason}] {relative_path}")


def scan_source(
    source: Path,
    output: Path,
    ignore_rules: Sequence[RegexRule],
    include_rules: Sequence[RegexRule],
    code_only: bool,
    verbose: bool,
) -> tuple[list[Candidate], ScanStats]:
    """扫描目录并返回待写入 ZIP 的文件列表。"""
    candidates: list[Candidate] = []
    stats = ScanStats()

    output_resolved = output.resolve(strict=False)

    def on_walk_error(error: OSError) -> None:
        raise error

    try:
        walker = os.walk(source, topdown=True, followlinks=False, onerror=on_walk_error)
        for root_text, directory_names, file_names in walker:
            root = Path(root_text)

            # 排序确保不同机器上的归档条目顺序尽量稳定。
            directory_names.sort()
            file_names.sort()

            kept_directories: list[str] = []
            for directory_name in directory_names:
                absolute_dir = root / directory_name
                relative_dir = absolute_dir.relative_to(source)
                relative_text = normalized_relative(relative_dir)

                if absolute_dir.is_symlink():
                    stats.symlinks += 1
                    log_skip(verbose, relative_text, "符号链接目录")
                    continue

                matched = first_match(ignore_rules, relative_text)
                if matched is not None:
                    stats.ignored += 1
                    log_skip(verbose, relative_text, f"正则 {matched.source}")
                    continue

                kept_directories.append(directory_name)

            # 原地修改，阻止 os.walk 进入已忽略目录。
            directory_names[:] = kept_directories

            for file_name in file_names:
                absolute_file = root / file_name
                relative_file = absolute_file.relative_to(source)
                relative_text = normalized_relative(relative_file)

                if absolute_file.is_symlink():
                    stats.symlinks += 1
                    log_skip(verbose, relative_text, "符号链接文件")
                    continue

                if absolute_file.resolve(strict=False) == output_resolved:
                    stats.output_file += 1
                    log_skip(verbose, relative_text, "输出 ZIP 本身")
                    continue

                matched = first_match(ignore_rules, relative_text)
                if matched is not None:
                    stats.ignored += 1
                    log_skip(verbose, relative_text, f"正则 {matched.source}")
                    continue

                explicitly_included = first_match(include_rules, relative_text) is not None
                if code_only and not explicitly_included and not is_code_file(absolute_file):
                    stats.non_code += 1
                    log_skip(verbose, relative_text, "非源码文件")
                    continue

                try:
                    file_size = absolute_file.stat().st_size
                except OSError as exc:
                    raise ZipSourceError(f"无法读取文件信息 {absolute_file}: {exc}") from exc

                candidates.append(
                    Candidate(
                        absolute_path=absolute_file,
                        relative_path=relative_file,
                        size=file_size,
                    )
                )
                stats.included += 1
                stats.included_bytes += file_size
    except OSError as exc:
        raise ZipSourceError(f"扫描目录失败: {exc}") from exc

    candidates.sort(key=lambda item: item.relative_path.as_posix())
    return candidates, stats


def create_archive(
    source: Path,
    output: Path,
    candidates: Sequence[Candidate],
    compression_level: int,
    contents_only: bool,
) -> None:
    """原子方式创建 ZIP：成功后才替换最终输出文件。"""
    try:
        output.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise ZipSourceError(f"无法创建输出目录 {output.parent}: {exc}") from exc

    temp_path: Path | None = None
    try:
        file_descriptor, temp_name = tempfile.mkstemp(
            prefix=f".{output.name}.",
            suffix=".tmp",
            dir=output.parent,
        )
        os.close(file_descriptor)
        temp_path = Path(temp_name)

        compression = zipfile.ZIP_STORED if compression_level == 0 else zipfile.ZIP_DEFLATED
        zip_kwargs: dict[str, object] = {
            "mode": "w",
            "compression": compression,
            "allowZip64": True,
        }
        if compression != zipfile.ZIP_STORED:
            zip_kwargs["compresslevel"] = compression_level

        root_name = archive_root_name(source)
        with zipfile.ZipFile(temp_path, **zip_kwargs) as archive:
            for candidate in candidates:
                relative_text = candidate.relative_path.as_posix()
                archive_name = relative_text if contents_only else f"{root_name}/{relative_text}"
                archive.write(candidate.absolute_path, arcname=archive_name)

        os.replace(temp_path, output)
        temp_path = None
    except (OSError, RuntimeError, zipfile.BadZipFile) as exc:
        raise ZipSourceError(f"创建 ZIP 失败: {exc}") from exc
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass


def print_defaults() -> None:
    print("默认 IGNORE 正则：")
    for pattern in IGNORE:
        print(f"  {pattern}")
    print("\n默认源码扩展名：")
    print("  " + " ".join(sorted(CODE_EXTENSIONS)))
    print("\n默认特殊源码文件名：")
    print("  " + " ".join(sorted(CODE_FILENAMES)))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="将指定目录压缩为只包含源码的 ZIP。默认使用正则排除依赖、构建产物、秘密文件、YAML 和压缩包。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "示例：\n"
            "  uv run zip_source_code.py ./my-project\n"
            "  uv run zip_source_code.py ./my-project -o ./backup/project.zip --force\n"
            "  uv run zip_source_code.py ./my-project --dry-run --verbose\n"
            "  uv run zip_source_code.py ./my-project --ignore '(^|/)fixtures?(/|$)'\n"
            "  uv run zip_source_code.py ./my-project --include '(^|/)package\\.json$'\n"
            "\n"
            "注意：--ignore 和 IGNORE 使用正则表达式，不是 Git 的 glob 语法。"
        ),
    )
    parser.add_argument(
        "directory",
        nargs="?",
        type=Path,
        help="要压缩的源码目录",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="输出 ZIP；默认是待压缩目录旁边的 <目录名>.code.zip",
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help="允许覆盖已存在的输出 ZIP",
    )
    parser.add_argument(
        "--ignore",
        action="append",
        default=[],
        metavar="REGEX",
        help="追加忽略正则；可重复使用",
    )
    parser.add_argument(
        "--ignore-from",
        action="append",
        default=[],
        type=Path,
        metavar="FILE",
        help="从 UTF-8 文件读取忽略正则，每行一个；空行和 # 注释会被忽略；可重复使用",
    )
    parser.add_argument(
        "--include",
        action="append",
        default=[],
        metavar="REGEX",
        help="在仅源码模式下额外纳入匹配文件；默认 IGNORE 仍优先；可重复使用",
    )
    parser.add_argument(
        "--all-files",
        action="store_true",
        help="关闭源码扩展名白名单，纳入所有未被 IGNORE 排除的普通文件",
    )
    parser.add_argument(
        "--no-default-ignore",
        action="store_true",
        help="禁用脚本内置 IGNORE；可能把秘密文件或依赖打包，请谨慎使用",
    )
    parser.add_argument(
        "--contents-only",
        action="store_true",
        help="ZIP 内不创建顶层目录，直接写入目录内容",
    )
    parser.add_argument(
        "--compression-level",
        type=int,
        choices=range(0, 10),
        default=9,
        metavar="0-9",
        help="压缩级别，0 表示仅存储，1 最快，9 压缩率最高；默认 9",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只显示将被纳入的文件，不创建 ZIP",
    )
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="即使没有匹配文件，也允许创建空 ZIP",
    )
    output_group = parser.add_mutually_exclusive_group()
    output_group.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="显示每个被跳过文件的原因",
    )
    output_group.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="成功时仅输出 ZIP 的绝对路径",
    )
    parser.add_argument(
        "--show-defaults",
        action="store_true",
        help="显示内置 IGNORE、源码扩展名和特殊文件名后退出",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}",
    )
    return parser


def run(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.show_defaults:
        print_defaults()
        return 0

    if args.directory is None:
        parser.error("缺少要压缩的目录")

    source = args.directory.expanduser().resolve(strict=False)
    if not source.exists():
        raise ZipSourceError(f"目录不存在: {source}")
    if not source.is_dir():
        raise ZipSourceError(f"参数不是目录: {source}")

    output = normalize_output_path(args.output) if args.output else default_output_path(source)
    output = output.resolve(strict=False)

    if output.exists() and output.is_dir():
        raise ZipSourceError(f"输出路径是目录，不是 ZIP 文件: {output}")
    if output.exists() and not args.force and not args.dry_run:
        raise ZipSourceError(f"输出文件已存在: {output}；使用 --force 覆盖")

    ignore_patterns: list[str] = [] if args.no_default_ignore else list(IGNORE)
    ignore_patterns.extend(args.ignore)
    for regex_file in args.ignore_from:
        ignore_patterns.extend(load_regex_file(regex_file.expanduser().resolve(strict=False)))

    ignore_rules = compile_rules(ignore_patterns, "忽略规则")
    include_rules = compile_rules(args.include, "额外纳入规则")

    candidates, stats = scan_source(
        source=source,
        output=output,
        ignore_rules=ignore_rules,
        include_rules=include_rules,
        code_only=not args.all_files,
        verbose=args.verbose,
    )

    if args.dry_run and not args.quiet:
        for candidate in candidates:
            print(f"[包含] {candidate.relative_path.as_posix()}")

    if not candidates and not args.allow_empty:
        raise ZipSourceError(
            "没有找到可打包文件；可检查 IGNORE/源码扩展名，或使用 --all-files、--include、--allow-empty"
        )

    if not args.quiet:
        print(
            "扫描结果: "
            f"包含 {stats.included} 个文件（{human_size(stats.included_bytes)}）；"
            f"正则忽略 {stats.ignored} 项；"
            f"非源码 {stats.non_code} 项；"
            f"符号链接 {stats.symlinks} 项。"
        )

    if args.dry_run:
        if not args.quiet:
            print("预览完成：未创建 ZIP。")
        return 0

    create_archive(
        source=source,
        output=output,
        candidates=candidates,
        compression_level=args.compression_level,
        contents_only=args.contents_only,
    )

    try:
        archive_size = output.stat().st_size
    except OSError:
        archive_size = 0

    if args.quiet:
        print(output)
    else:
        print(f"已创建: {output}")
        print(f"ZIP 大小: {human_size(archive_size)}")
    return 0


def main() -> None:
    try:
        raise SystemExit(run())
    except ZipSourceError as exc:
        print(f"错误: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    except KeyboardInterrupt:
        print("\n操作已取消。", file=sys.stderr)
        raise SystemExit(130)


if __name__ == "__main__":
    main()
