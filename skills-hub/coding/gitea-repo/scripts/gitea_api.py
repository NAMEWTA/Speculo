#!/usr/bin/env python3
"""Generic Gitea/Forgejo HTTP API wrapper, gh-style.

Token is read from --token / GITEA_TOKEN / git credential fill only; never printed.
"""

from __future__ import annotations

import argparse
import ipaddress
import json
import os
import ssl
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_LIMIT = 50
API_PREFIX = "/api/v1"
GITHUB_HOSTS = {"github.com", "www.github.com"}
SSL_CONTEXT: ssl.SSLContext | None = None


class GiteaError(Exception):
    def __init__(self, status: int, message: str, body: Any = None) -> None:
        super().__init__(f"HTTP {status}: {message}")
        self.status = status
        self.message = message
        self.body = body


def die(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def read_body_text(inline: str | None, path: str | None, required: bool = False) -> str:
    """优先读 --body-file，避免 Windows 命令行长度限制。"""
    if path:
        file_path = Path(path)
        if not file_path.is_file():
            die(f"找不到 --body-file: {path}")
        return file_path.read_text(encoding="utf-8")
    if inline:
        return inline
    if required:
        die("需要 --body 或 --body-file")
    return ""


def git_output(args: list[str], cwd: str | None = None) -> str:
    try:
        proc = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except FileNotFoundError:
        return ""
    if proc.returncode != 0:
        return ""
    return (proc.stdout or "").strip()


def _hostname_is_private(hostname: str) -> bool:
    host = hostname.strip().strip("[]").split("%", 1)[0]
    if host in {"localhost", "127.0.0.1", "::1"}:
        return True
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return bool(ip.is_private or ip.is_loopback or ip.is_link_local)


def _ssh_host_url(hostname: str, port: int | None = None) -> str:
    """SSH transport ports do not identify an HTTP API port; never infer plaintext."""
    del port
    host = f"[{hostname}]" if ":" in hostname and not hostname.startswith("[") else hostname
    return f"https://{host}"


def is_github_host(host_url: str) -> bool:
    host = (urllib.parse.urlparse(host_url).hostname or "").lower()
    return host in GITHUB_HOSTS or host.endswith(".github.com")


def parse_remote_url(url: str) -> tuple[str, str, str] | None:
    """Parse git remote into (instance_root, owner, repo).

    Extra path segments before owner/repo become the instance subpath
    (Gitea installed at https://example.com/git/owner/repo).
    """
    if not url:
        return None
    url = url.strip()
    if url.endswith(".git"):
        url = url[:-4]

    if url.startswith("git@"):
        _, rest = url.split("@", 1)
        if ":" not in rest:
            return None
        host, path = rest.split(":", 1)
        return _split_instance_and_repo(_ssh_host_url(host), path)

    parsed = urllib.parse.urlparse(url)
    if parsed.scheme in {"ssh", "git"}:
        host = parsed.hostname
        if not host:
            return None
        return _split_instance_and_repo(_ssh_host_url(host, parsed.port), parsed.path)

    if not parsed.scheme or not parsed.netloc:
        return None
    hostname = parsed.hostname or parsed.netloc
    host_url = f"{parsed.scheme}://{hostname}"
    if parsed.port:
        host_url += f":{parsed.port}"
    return _split_instance_and_repo(host_url, parsed.path)


def _split_instance_and_repo(host_url: str, path: str) -> tuple[str, str, str] | None:
    parts = [p for p in path.split("/") if p]
    if len(parts) < 2:
        return None
    owner, repo = parts[-2], parts[-1]
    prefix = "/".join(parts[:-2])
    root = host_url.rstrip("/")
    if prefix:
        root = f"{root}/{prefix}"
    return root, owner, repo


def discover_remote(remote_name: str | None = None) -> tuple[str, str, str] | None:
    if remote_name:
        return parse_remote_url(git_output(["remote", "get-url", remote_name]))

    remotes = [r for r in git_output(["remote"]).splitlines() if r]
    ordered: list[str] = []
    if "origin" in remotes:
        ordered.append("origin")
    ordered.extend(r for r in remotes if r != "origin")

    for name in ordered:
        parsed = parse_remote_url(git_output(["remote", "get-url", name]))
        if not parsed:
            continue
        if is_github_host(parsed[0]):
            continue
        return parsed
    return None


def credential_token(host_url: str) -> str:
    """用 git credential fill 取 PAT，避免在命令行回显密码。"""
    parsed = urllib.parse.urlparse(host_url)
    body = f"protocol={parsed.scheme}\nhost={parsed.netloc}\n\n"
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GCM_INTERACTIVE"] = "never"
    try:
        proc = subprocess.run(
            ["git", "credential", "fill"],
            input=body,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            env=env,
        )
    except FileNotFoundError:
        return ""
    if proc.returncode != 0:
        return ""
    for line in proc.stdout.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1].strip()
    return ""


def resolve_context(args: argparse.Namespace) -> tuple[str, str, str, str]:
    discovered = discover_remote(getattr(args, "remote", None))
    host = (args.host or os.environ.get("GITEA_HOST") or (discovered[0] if discovered else "")).rstrip(
        "/"
    )
    if not host:
        die(
            "未确定 Gitea 实例。请传 --host（例如 https://gitea.example.com），"
            "或设置 GITEA_HOST，或在已配置 Gitea/Forgejo remote 的仓库内运行。"
            "GitHub.com 请用 gh / github-repo-steward。"
        )
    if is_github_host(host):
        die("GITEA_HOST/remote 指向 GitHub。请用 gh / github-repo-steward。")

    repo_spec = args.repo or os.environ.get("GITEA_REPO") or ""
    if repo_spec:
        if "/" not in repo_spec:
            die("--repo 需要 owner/repo 形式")
        owner, repo = repo_spec.split("/", 1)
    elif discovered:
        owner, repo = discovered[1], discovered[2]
    else:
        die("未确定仓库。请传 --repo owner/repo，或设置 GITEA_REPO，或在目标仓内运行。")

    token = args.token or os.environ.get("GITEA_TOKEN") or credential_token(host)
    if not token:
        cred_host = urllib.parse.urlparse(host).netloc or host
        die(
            "未找到 Gitea 令牌。请设置 GITEA_TOKEN，或把 PAT 写入 "
            f"git credential（host={cred_host}），或传 --token。"
        )
    return host, owner, repo, token


def api_request(
    host: str,
    token: str,
    method: str,
    path: str,
    query: dict[str, Any] | None = None,
    body: Any = None,
) -> tuple[Any, dict[str, str]]:
    path = path if path.startswith("/") else "/" + path
    if not path.startswith(API_PREFIX):
        path = API_PREFIX + path
    query = {k: v for k, v in (query or {}).items() if v is not None and v != ""}
    url = host + path
    if query:
        url += "?" + urllib.parse.urlencode(query, doseq=True)
    data = None
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/json",
        "User-Agent": "gitea-repo",
    }
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method.upper(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60, context=SSL_CONTEXT) as resp:
            raw = resp.read()
            hdrs = {k.lower(): v for k, v in resp.headers.items()}
            if not raw:
                return None, hdrs
            try:
                return json.loads(raw.decode("utf-8")), hdrs
            except json.JSONDecodeError:
                return raw.decode("utf-8", errors="replace"), hdrs
    except urllib.error.HTTPError as err:
        raw = err.read()
        parsed: Any
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except Exception:
            parsed = raw.decode("utf-8", errors="replace")
        message = parsed.get("message") if isinstance(parsed, dict) else str(parsed)
        raise GiteaError(err.code, message or err.reason, parsed) from None
    except urllib.error.URLError as err:
        raise GiteaError(0, str(err.reason or err)) from None


def paginate(
    host: str,
    token: str,
    path: str,
    query: dict[str, Any],
    fetch_all: bool,
    limit: int,
) -> list[Any]:
    items: list[Any] = []
    page = int(query.get("page") or 1)
    if page < 1 or limit < 1:
        raise GiteaError(0, "page and limit must be positive")
    previous_batch: list[Any] | None = None
    while True:
        q = dict(query)
        q["page"] = page
        q["limit"] = limit
        payload, _hdrs = api_request(host, token, "GET", path, q)
        batch = payload if isinstance(payload, list) else None
        # /repos/search 返回 {ok, data}
        if isinstance(payload, dict) and isinstance(payload.get("data"), list):
            batch = payload["data"]
        if batch is None:
            raise GiteaError(0, "Expected an array or a data array from paginated endpoint")
        if fetch_all and batch and batch == previous_batch:
            raise GiteaError(0, "Pagination did not advance; refusing to report a complete list")
        items.extend(batch)
        # Servers can cap the requested limit. A short page is not proof of EOF.
        if not fetch_all or not batch:
            break
        previous_batch = batch
        page += 1
    return items


def emit(data: Any, as_json: bool) -> None:
    if as_json or not isinstance(data, (dict, list, str)):
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return
    print(data)


def fmt_issue_row(item: dict[str, Any]) -> str:
    number = item.get("number")
    state = item.get("state")
    title = (item.get("title") or "").replace("\t", " ")
    user = (item.get("user") or {}).get("login") or ""
    labels = ",".join(lbl.get("name") or "" for lbl in (item.get("labels") or []) if lbl)
    kind = "pr" if item.get("pull_request") else "issue"
    return f"#{number}\t{kind}\t{state}\t{user}\t{labels}\t{title}"


def resolve_label_ids(host: str, token: str, owner: str, repo: str, labels: list[str]) -> list[int]:
    if not labels:
        return []
    # A label name may be on a later page of the catalog.
    existing = paginate(host, token, f"/repos/{owner}/{repo}/labels", {}, True, DEFAULT_LIMIT)
    by_name = {str(x.get("name")): int(x["id"]) for x in existing or []}
    ids: list[int] = []
    for raw in labels:
        if raw.isdigit():
            ids.append(int(raw))
            continue
        if raw not in by_name:
            die(f"找不到标签: {raw}。现有: {', '.join(by_name) or '(无)'}")
        ids.append(by_name[raw])
    return ids


def cmd_version(ctx: tuple[str, str, str, str], _args: argparse.Namespace) -> None:
    host, _o, _r, token = ctx
    try:
        payload, _ = api_request(host, token, "GET", "/version")
        emit(payload, True)
    except GiteaError as err:
        die(f"GET /version 失败（{err}）。实例仍可能可用，请改用 issue list 验证。")


def cmd_whoami(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    try:
        payload, _ = api_request(host, token, "GET", "/user")
        emit(payload, args.json)
        return
    except GiteaError as err:
        if err.status != 403:
            die(str(err))
        # 缺 read:user 时退化为探测仓库可达性，避免误判令牌失效
        probe_path = f"/repos/{owner}/{repo}"
        repo_obj, _ = api_request(host, token, "GET", probe_path)
        out = {
            "login": None,
            "note": "GET /user 需要 read:user，当前令牌无此 scope",
            "error": err.message,
            "repo": repo_obj.get("full_name") if isinstance(repo_obj, dict) else probe_path,
            "permissions": repo_obj.get("permissions") if isinstance(repo_obj, dict) else None,
        }
        emit(out, True)


def cmd_issue_list(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    query = {
        "state": args.state,
        "type": args.type,
        "q": args.q,
        "labels": args.labels,
        "page": args.page,
        "limit": args.limit,
    }
    items = paginate(
        host, token, f"/repos/{owner}/{repo}/issues", query, args.all, args.limit
    )
    if args.json:
        emit(items, True)
        return
    if not items:
        print("(empty)")
        return
    print("number\tkind\tstate\tuser\tlabels\ttitle")
    for item in items:
        print(fmt_issue_row(item))


def cmd_issue_view(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    payload, _ = api_request(host, token, "GET", f"/repos/{owner}/{repo}/issues/{args.index}")
    if args.json:
        emit(payload, True)
        return
    labels = ", ".join(x.get("name") or "" for x in (payload.get("labels") or []) if x)
    assignees = ", ".join(
        (x or {}).get("login") or "" for x in (payload.get("assignees") or []) if x
    )
    print(f"#{payload.get('number')} {payload.get('state')}  {payload.get('title')}")
    print(f"author: {(payload.get('user') or {}).get('login')}")
    print(f"url: {payload.get('html_url')}")
    print(f"labels: {labels or '-'}")
    print(f"assignees: {assignees or '-'}")
    print(f"comments: {payload.get('comments')}")
    print()
    print(payload.get("body") or "")


def cmd_issue_create(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    body: dict[str, Any] = {
        "title": args.title,
        "body": read_body_text(args.body, args.body_file),
    }
    if args.assignee:
        body["assignees"] = args.assignee
    if args.label:
        body["labels"] = resolve_label_ids(host, token, owner, repo, args.label)
    payload, _ = api_request(host, token, "POST", f"/repos/{owner}/{repo}/issues", body=body)
    emit(payload if args.json else f"#{payload.get('number')} {payload.get('html_url')}", args.json)


def cmd_issue_state(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    state = "closed" if args.action == "close" else "open"
    payload, _ = api_request(
        host,
        token,
        "PATCH",
        f"/repos/{owner}/{repo}/issues/{args.index}",
        body={"state": state},
    )
    emit(payload if args.json else f"#{payload.get('number')} {payload.get('state')}", args.json)


def cmd_issue_comment(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    payload, _ = api_request(
        host,
        token,
        "POST",
        f"/repos/{owner}/{repo}/issues/{args.index}/comments",
        body={"body": read_body_text(args.body, args.body_file, required=True)},
    )
    emit(payload if args.json else f"comment {payload.get('id')} on #{args.index}", args.json)


def cmd_issue_comments(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    items = paginate(
        host,
        token,
        f"/repos/{owner}/{repo}/issues/{args.index}/comments",
        {"page": args.page, "limit": args.limit},
        args.all,
        args.limit,
    )
    if args.json:
        emit(items, True)
        return
    if not items:
        print("(empty)")
        return
    for item in items:
        login = (item.get("user") or {}).get("login")
        print(f"[{item.get('id')}] {login} {item.get('created_at')}")
        print(item.get("body") or "")
        print("---")


def cmd_pr_list(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    items = paginate(
        host,
        token,
        f"/repos/{owner}/{repo}/pulls",
        {"state": args.state, "page": args.page, "limit": args.limit},
        args.all,
        args.limit,
    )
    if args.json:
        emit(items, True)
        return
    if not items:
        print("(empty)")
        return
    print("number\tstate\tuser\thead -> base\ttitle")
    for item in items:
        head = ((item.get("head") or {}).get("ref")) or ""
        base = ((item.get("base") or {}).get("ref")) or ""
        user = (item.get("user") or {}).get("login") or ""
        title = (item.get("title") or "").replace("\t", " ")
        print(f"#{item.get('number')}\t{item.get('state')}\t{user}\t{head} -> {base}\t{title}")


def cmd_pr_view(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    payload, _ = api_request(host, token, "GET", f"/repos/{owner}/{repo}/pulls/{args.index}")
    if args.json:
        emit(payload, True)
        return
    head = ((payload.get("head") or {}).get("ref")) or ""
    base = ((payload.get("base") or {}).get("ref")) or ""
    print(f"#{payload.get('number')} {payload.get('state')}  {payload.get('title')}")
    print(f"{head} -> {base}")
    print(f"url: {payload.get('html_url')}")
    print(f"merged: {payload.get('merged')}")
    print()
    print(payload.get("body") or "")


def cmd_pr_create(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    payload, _ = api_request(
        host,
        token,
        "POST",
        f"/repos/{owner}/{repo}/pulls",
        body={
            "title": args.title,
            "body": read_body_text(args.body, args.body_file),
            "head": args.head,
            "base": args.base,
        },
    )
    emit(payload if args.json else f"#{payload.get('number')} {payload.get('html_url')}", args.json)


def cmd_pr_merge(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    # Gitea 合并体字段名必须是 Do，小写 do 会被忽略
    body: dict[str, Any] = {"Do": args.style}
    if args.delete_branch:
        body["delete_branch_after_merge"] = True
    payload, _ = api_request(
        host, token, "POST", f"/repos/{owner}/{repo}/pulls/{args.index}/merge", body=body
    )
    emit(payload if payload is not None else {"ok": True, "index": args.index}, True)


def cmd_simple_list(path_tpl: str):
    def _run(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
        host, owner, repo, token = ctx
        query = {"page": args.page, "limit": args.limit}
        if hasattr(args, "state") and args.state:
            query["state"] = args.state
        items = paginate(host, token, path_tpl.format(owner=owner, repo=repo), query, args.all, args.limit)
        if args.json:
            emit(items, True)
            return
        if not items:
            print("(empty)")
            return
        for item in items:
            if "name" in item and "id" in item:
                print(f"{item.get('id')}\t{item.get('name')}\t{item.get('color') or ''}")
            elif "title" in item:
                print(f"{item.get('id')}\t{item.get('state')}\t{item.get('title')}")
            elif "tag_name" in item:
                print(f"{item.get('id')}\t{item.get('tag_name')}\t{item.get('title')}")
            else:
                print(json.dumps(item, ensure_ascii=False))

    return _run


def cmd_repo_view(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    payload, _ = api_request(host, token, "GET", f"/repos/{owner}/{repo}")
    if args.json:
        emit(payload, True)
        return
    print(payload.get("full_name"))
    print(payload.get("html_url"))
    print(f"default_branch: {payload.get('default_branch')}")
    print(f"private: {payload.get('private')}  empty: {payload.get('empty')}")
    print(payload.get("description") or "")


def cmd_search_issues(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, _owner, _repo, token = ctx
    items = paginate(
        host,
        token,
        "/repos/issues/search",
        {
            "state": args.state,
            "type": args.type,
            "q": args.q,
            "owner": args.owner,
            "page": args.page,
            "limit": args.limit,
        },
        args.all,
        args.limit,
    )
    if args.json:
        emit(items, True)
        return
    if not items:
        print("(empty)")
        return
    print("repo\tnumber\tkind\tstate\ttitle")
    for item in items:
        repo = (item.get("repository") or {}).get("full_name") or ""
        kind = "pr" if item.get("pull_request") else "issue"
        print(f"{repo}\t#{item.get('number')}\t{kind}\t{item.get('state')}\t{item.get('title')}")


def cmd_api(ctx: tuple[str, str, str, str], args: argparse.Namespace) -> None:
    host, owner, repo, token = ctx
    path = args.path.replace("{owner}", owner).replace("{repo}", repo)
    body = json.loads(args.body) if args.body else None
    query = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(path).query))
    path_only = urllib.parse.urlparse(path).path
    method = args.method.upper()
    if args.paginate and method == "GET":
        items = paginate(host, token, path_only, query, True, int(query.get("limit") or args.limit))
        emit(items, True)
        return
    payload, hdrs = api_request(host, token, method, path_only, query, body)
    if args.json or not isinstance(payload, str):
        if args.include_headers:
            emit({"headers": hdrs, "body": payload}, True)
        else:
            emit(payload, True)
        return
    print(payload)


def add_page_flags(p: argparse.ArgumentParser) -> None:
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    p.add_argument("--all", action="store_true", help="自动翻页直到取完")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Gitea/Forgejo HTTP API（gh 风格）")
    parser.add_argument("--host", help="实例根 URL，例如 https://gitea.example.com")
    parser.add_argument("--repo", help="owner/repo；默认从 git remote 解析")
    parser.add_argument("--remote", help="从该 git remote 解析 host/repo，默认 origin 再其它非 GitHub remote")
    parser.add_argument("--token", help="PAT；默认读 GITEA_TOKEN 或 git credential")
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="跳过 HTTPS 证书校验（自签证书）；也可设 GITEA_INSECURE=1",
    )
    parser.add_argument("--json", action="store_true", help="输出原始 JSON")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("version", help="GET /version")
    sub.add_parser("whoami", help="GET /user，缺 scope 时探测仓库权限")

    issue = sub.add_parser("issue", help="issue 操作")
    issue_sub = issue.add_subparsers(dest="issue_cmd", required=True)

    p = issue_sub.add_parser("list")
    p.add_argument("--state", default="open", choices=["open", "closed", "all"])
    p.add_argument("--type", default="issues", choices=["issues", "pulls"])
    p.add_argument("--q")
    p.add_argument("--labels", help="标签名，逗号分隔")
    add_page_flags(p)

    p = issue_sub.add_parser("view")
    p.add_argument("index", type=int)

    p = issue_sub.add_parser("create")
    p.add_argument("--title", required=True)
    p.add_argument("--body", default="")
    p.add_argument("--body-file", help="从 UTF-8 文件读取正文，优先于 --body")
    p.add_argument("--assignee", action="append", default=[])
    p.add_argument("--label", action="append", default=[], help="标签名或 ID，可重复")

    p = issue_sub.add_parser("close")
    p.add_argument("index", type=int)
    p = issue_sub.add_parser("reopen")
    p.add_argument("index", type=int)

    p = issue_sub.add_parser("comment")
    p.add_argument("index", type=int)
    p.add_argument("--body", default="")
    p.add_argument("--body-file", help="从 UTF-8 文件读取评论，优先于 --body")

    p = issue_sub.add_parser("comments")
    p.add_argument("index", type=int)
    add_page_flags(p)

    pr = sub.add_parser("pr", help="pull request 操作")
    pr_sub = pr.add_subparsers(dest="pr_cmd", required=True)
    p = pr_sub.add_parser("list")
    p.add_argument("--state", default="open", choices=["open", "closed", "all"])
    add_page_flags(p)
    p = pr_sub.add_parser("view")
    p.add_argument("index", type=int)
    p = pr_sub.add_parser("create")
    p.add_argument("--title", required=True)
    p.add_argument("--head", required=True)
    p.add_argument("--base", required=True)
    p.add_argument("--body", default="")
    p.add_argument("--body-file", help="从 UTF-8 文件读取正文，优先于 --body")
    p = pr_sub.add_parser("merge")
    p.add_argument("index", type=int)
    p.add_argument("--style", default="merge", choices=["merge", "squash", "rebase", "rebase-merge"])
    p.add_argument("--delete-branch", action="store_true")

    p = sub.add_parser("label")
    label_sub = p.add_subparsers(dest="label_cmd", required=True)
    lp = label_sub.add_parser("list")
    add_page_flags(lp)

    p = sub.add_parser("milestone")
    ms = p.add_subparsers(dest="milestone_cmd", required=True)
    mp = ms.add_parser("list")
    mp.add_argument("--state", default="open", choices=["open", "closed", "all"])
    add_page_flags(mp)

    p = sub.add_parser("release")
    rs = p.add_subparsers(dest="release_cmd", required=True)
    rp = rs.add_parser("list")
    add_page_flags(rp)

    repo_grp = sub.add_parser("repo", help="仓库信息")
    repo_sub = repo_grp.add_subparsers(dest="repo_cmd", required=True)
    repo_sub.add_parser("view")

    p = sub.add_parser("search")
    ss = p.add_subparsers(dest="search_cmd", required=True)
    sp = ss.add_parser("issues")
    sp.add_argument("--q")
    sp.add_argument("--state", default="open", choices=["open", "closed", "all"])
    sp.add_argument("--type", default="issues", choices=["issues", "pulls"])
    sp.add_argument("--owner")
    add_page_flags(sp)

    p = sub.add_parser("api", help="透传任意 /api/v1 路径")
    p.add_argument("method", help="GET/POST/PATCH/PUT/DELETE")
    p.add_argument("path", help="如 /repos/{owner}/{repo}/issues")
    p.add_argument("--body", help="JSON 字符串")
    p.add_argument("--paginate", action="store_true")
    p.add_argument("--include-headers", action="store_true")
    p.add_argument("--limit", type=int, default=DEFAULT_LIMIT)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    global SSL_CONTEXT
    insecure = bool(args.insecure) or os.environ.get("GITEA_INSECURE", "").strip() in {
        "1",
        "true",
        "TRUE",
        "yes",
        "YES",
    }
    SSL_CONTEXT = ssl._create_unverified_context() if insecure else None
    try:
        ctx = resolve_context(args)
        cmd = args.cmd
        if cmd == "version":
            cmd_version(ctx, args)
        elif cmd == "whoami":
            cmd_whoami(ctx, args)
        elif cmd == "issue":
            if args.issue_cmd in ("close", "reopen"):
                args.action = args.issue_cmd
                cmd_issue_state(ctx, args)
            else:
                {
                    "list": cmd_issue_list,
                    "view": cmd_issue_view,
                    "create": cmd_issue_create,
                    "comment": cmd_issue_comment,
                    "comments": cmd_issue_comments,
                }[args.issue_cmd](ctx, args)
        elif cmd == "pr":
            mapping = {
                "list": cmd_pr_list,
                "view": cmd_pr_view,
                "create": cmd_pr_create,
                "merge": cmd_pr_merge,
            }
            mapping[args.pr_cmd](ctx, args)
        elif cmd == "label":
            cmd_simple_list("/repos/{owner}/{repo}/labels")(ctx, args)
        elif cmd == "milestone":
            cmd_simple_list("/repos/{owner}/{repo}/milestones")(ctx, args)
        elif cmd == "release":
            cmd_simple_list("/repos/{owner}/{repo}/releases")(ctx, args)
        elif cmd == "repo":
            cmd_repo_view(ctx, args)
        elif cmd == "search":
            cmd_search_issues(ctx, args)
        elif cmd == "api":
            cmd_api(ctx, args)
        else:
            die(f"未知命令: {cmd}")
        return 0
    except GiteaError as err:
        die(str(err))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
