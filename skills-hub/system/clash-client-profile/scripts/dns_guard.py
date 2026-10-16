#!/usr/bin/env python3
"""Mihomo DNS plan/audit and opt-in DoH probes. Python 3.10+, curl for probes.

Never edits a profile, changes OS settings, resolves names locally, or retries
without the specified proxy. JSON needs no dependencies; YAML needs PyYAML.
Output is a review plan, NOT a complete profile or a no-leak certificate.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import struct
import subprocess
import sys
from urllib.parse import quote, unquote, urlsplit

LIMIT = 1024 * 1024
RESERVED = {"DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE", "GLOBAL", "RULES"}
LEAF_TYPES = {"ss", "ssr", "vmess", "vless", "trojan", "socks5", "http", "wireguard",
              "hysteria", "hysteria2", "tuic", "snell", "ssh", "anytls"}
GROUP_TYPES = {"select", "url-test", "fallback", "load-balance", "relay"}
DNS_LISTS = ("nameserver", "fallback", "direct-nameserver")
DNS_MAPS = ("nameserver-policy", "proxy-server-nameserver-policy")
DOMESTIC_MARKERS = (
    "system", "dhcp://", "223.5.5.5", "223.6.6.6", "119.29.29.29", "180.76.76.76",
    "114.114.114.114", "2400:3200::1", "doh.pub", "alidns.com", "dnspod.cn", "dot.pub",
)
PENDING = ["installed_core_validation", "effective_config_readback", "application_rule_chain",
           "physical_interface_bootstrap_probe", "os_dns_interception_udp_tcp", "native_ipv6",
           "browser_doh_webrtc", "cold_start_and_provider_refresh", "sleep_network_change",
           "crash_isolation", "rollback"]


def unique_pairs(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise ValueError("Duplicate mapping key; values withheld")
        obj[key] = value
    return obj


def load_document(path: Path, with_digest: bool = False):
    """Bounded, duplicate-rejecting input; YAML aliases/custom tags are not allowed."""
    try:
        with path.open("rb") as handle:
            raw = handle.read(LIMIT + 1)
        if len(raw) > LIMIT:
            raise ValueError("Document exceeds 1 MiB")
        text = raw.decode("utf-8-sig")
        if path.suffix.lower() == ".json" or text.lstrip().startswith(("{", "[")):
            data = json.loads(text, object_pairs_hook=unique_pairs,
                              parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Non-finite JSON")))
        else:
            try:
                import yaml
            except ImportError:
                raise ValueError("YAML requires PyYAML; use a trusted local JSON export or install PyYAML explicitly") from None
            class Loader(yaml.SafeLoader):
                def compose_node(self, parent, index):
                    if self.check_event(yaml.AliasEvent):
                        raise ValueError("YAML aliases are not accepted; use a flattened effective export")
                    return super().compose_node(parent, index)
            def mapping(loader, node):
                return unique_pairs((loader.construct_object(k), loader.construct_object(v)) for k, v in node.value)
            Loader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
            data = yaml.load(text, Loader=Loader)
        if not isinstance(data, dict):
            raise ValueError("Expected a mapping, not a scalar/list")
        return (data, hashlib.sha256(raw).hexdigest()) if with_digest else data
    except ValueError:
        raise
    except Exception:
        # Parser errors can include a source line containing a secret.
        raise ValueError("Cannot read/parse document; raw input and parser error withheld") from None


def group_name(value: object) -> str:
    if (not isinstance(value, str) or not value or value != value.strip() or len(value) > 128
            or any(ord(c) < 32 or ord(c) == 127 or c in ",#&=%" for c in value)
            or value.upper() in RESERVED):
        raise ValueError("Choose an exact non-reserved group name without delimiters or controls")
    return value


def hostname(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Expected a DNS hostname")
    value = value.lower().rstrip(".")
    if len(value) > 253 or len(value.split(".")) < 2 or not all(
            re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", p) for p in value.split(".")):
        raise ValueError("Use an ASCII/punycode DNS hostname, not a URL or wildcard")
    try:
        ipaddress.ip_address(value)
    except ValueError:
        return value
    raise ValueError("An IP is not a DNS hostname")


def resolver_url(value: object, allow_selector: bool = False) -> tuple[str, str | None]:
    """Intentionally supports only public numeric DoH/DoT; no implicit bootstrap.

    Do not convert a provider's hostname URL into an IP URL without confirming its
    certificate supports that IP. Private/provider-only DNS needs manual review.
    """
    try:
        if not isinstance(value, str) or any(c.isspace() or ord(c) < 32 for c in value):
            raise ValueError
        u = urlsplit(value)
        if u.scheme not in ("https", "tls") or u.username is not None or u.password is not None or u.query:
            raise ValueError
        addr = ipaddress.ip_address(u.hostname or "")
        if not addr.is_global or "%" in (u.hostname or ""):
            raise ValueError
        if u.port is not None and not 1 <= u.port <= 65535:
            raise ValueError
        if u.scheme == "https" and (not u.path or u.path == "/"):
            raise ValueError
        if u.scheme == "tls" and u.path:
            raise ValueError
        selector = None
        if u.fragment:
            if not allow_selector or re.search(r"%(?![0-9a-fA-F]{2})", u.fragment):
                raise ValueError
            selector = group_name(unquote(u.fragment, errors="strict"))
        elif "#" in value:
            raise ValueError
        return value.split("#", 1)[0], selector
    except (ValueError, TypeError, UnicodeError):
        raise ValueError("Expected public numeric HTTPS DoH or tls://IP, no credentials/query/unsafe DNS options") from None


def plaintext_bootstrap_url(value: object) -> str:
    """tcp://public-IPv4-or-IPv6 on port 53 only. Node-name bootstrap, never a business resolver."""
    try:
        if not isinstance(value, str) or any(c.isspace() or ord(c) < 32 for c in value):
            raise ValueError
        u = urlsplit(value)
        if (u.scheme != "tcp" or u.username is not None or u.password is not None or u.path
                or u.query or u.fragment or "#" in value):
            raise ValueError
        addr = ipaddress.ip_address(u.hostname or "")
        if not addr.is_global or "%" in (u.hostname or "") or (u.port is not None and u.port != 53):
            raise ValueError
        if domestic_resolver(value):
            raise ValueError
        return value
    except (ValueError, TypeError):
        raise ValueError("Plaintext bootstrap must be tcp://public-IP with no selector, and not a domestic resolver") from None


def domestic_resolver(value: object) -> bool:
    if not isinstance(value, str):
        return False
    low = value.lower()
    return any(marker in low for marker in DOMESTIC_MARKERS)


def policy_request(data: dict) -> dict:
    if set(data) - {"schema_version", "group", "resolvers", "bootstrap", "ipv6", "targets",
                    "replace_existing_dns_policies", "routing"}:
        raise ValueError("Unknown policy key; no implicit configuration changes")
    if type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        raise ValueError("Expected policy schema_version 1")
    if type(data.get("replace_existing_dns_policies", False)) is not bool:
        raise ValueError("Policy replacement approval must be a boolean")
    group = group_name(data.get("group"))
    values = data.get("resolvers")
    if not isinstance(values, list) or not 1 <= len(values) <= 4:
        raise ValueError("Supply 1-4 explicitly selected encrypted resolvers")
    resolvers = []
    for value in values:
        url = resolver_url(value)[0]
        if domestic_resolver(url):
            raise ValueError("Domestic or system resolver is outside the foreign-public profile")
        resolvers.append(url)
    resolvers = list(dict.fromkeys(resolvers))
    routing = data.get("routing", "rule")
    if routing not in ("rule", "global"):
        raise ValueError("routing must be rule or global")
    bootstrap = data.get("bootstrap", {"mode": "deny"})
    if not isinstance(bootstrap, dict) or set(bootstrap) - {"mode", "resolvers", "acknowledge_direct_bootstrap",
                                                            "acknowledge_plaintext_metadata"}:
        raise ValueError("Invalid bootstrap policy")
    mode = bootstrap.get("mode")
    if mode == "deny":
        if set(bootstrap) != {"mode"}:
            raise ValueError("deny bootstrap must not include direct resolvers or approval")
        bootstrap = {"mode": "deny", "resolvers": []}
    elif mode == "encrypted-direct":
        if set(bootstrap) - {"mode", "resolvers", "acknowledge_direct_bootstrap"}:
            raise ValueError("encrypted-direct does not accept a plaintext acknowledgement")
        vals = bootstrap.get("resolvers")
        if (bootstrap.get("acknowledge_direct_bootstrap") is not True or not isinstance(vals, list)
                or not 1 <= len(vals) <= 4):
            raise ValueError("Direct bootstrap requires explicit approval and 1-4 numeric encrypted resolvers")
        chosen = []
        for value in vals:
            url = resolver_url(value)[0]
            if domestic_resolver(url):
                raise ValueError("Domestic or system resolver is outside the foreign-public profile")
            chosen.append(url)
        bootstrap = {"mode": mode, "resolvers": list(dict.fromkeys(chosen))}
    elif mode == "plaintext-direct":
        if set(bootstrap) != {"mode", "resolvers", "acknowledge_direct_bootstrap", "acknowledge_plaintext_metadata"}:
            raise ValueError("Plaintext bootstrap requires both explicit acknowledgements")
        vals = bootstrap.get("resolvers")
        if (bootstrap.get("acknowledge_direct_bootstrap") is not True
                or bootstrap.get("acknowledge_plaintext_metadata") is not True or not isinstance(vals, list)
                or not 1 <= len(vals) <= 4):
            raise ValueError("Plaintext bootstrap requires both approvals and 1-4 tcp://public-IP resolvers")
        bootstrap = {"mode": mode, "resolvers": list(dict.fromkeys(plaintext_bootstrap_url(v) for v in vals))}
    else:
        raise ValueError("Choose bootstrap deny, encrypted-direct, or explicitly approved plaintext-direct")
    if data.get("ipv6") not in ("tunnel", "block"):
        raise ValueError("Choose IPv6 tunnel or block; OS-level verification is still required")
    targets = data.get("targets")
    if not isinstance(targets, list) or not 1 <= len(targets) <= 64:
        raise ValueError("Supply 1-64 protected domain suffixes")
    return {"group": group, "resolvers": resolvers, "bootstrap": bootstrap, "routing": routing,
            "ipv6": data["ipv6"], "targets": list(dict.fromkeys(hostname(t) for t in targets)),
            "replace_existing_dns_policies": data.get("replace_existing_dns_policies", False)}


def finding(items: list, code: str, severity: str = "error", location: str = ""):
    items.append({"code": code, "severity": severity, "location": location})


def check_graph(config: dict, request: dict) -> list:
    """Review ALL reachable choices, not only a possibly stale selected leaf."""
    issues, objects = [], {}
    for field in ("proxies", "proxy-groups"):
        values = config.get(field, [])
        if not isinstance(values, list) or len(values) > 4096:
            finding(issues, "INVALID_PROXY_GRAPH", location=field)
            continue
        for index, obj in enumerate(values):
            loc = f"{field}[{index}]"
            if not isinstance(obj, dict) or not isinstance(obj.get("name"), str):
                finding(issues, "INVALID_PROXY_OBJECT", location=loc)
                continue
            if obj["name"] in objects or obj["name"].upper() in RESERVED:
                finding(issues, "DUPLICATE_OR_RESERVED_PROXY", location=loc)
            objects[obj["name"]] = (obj, loc, field)
    target = objects.get(request["group"])
    if not target or target[2] != "proxy-groups":
        finding(issues, "GROUP_MISSING_OR_NOT_A_GROUP")
        return issues
    visiting, visited = set(), set()
    def visit(name, depth=0):
        if depth > 64 or name in visiting:
            finding(issues, "PROXY_GROUP_CYCLE_OR_DEPTH")
            return
        if name.upper() in RESERVED:
            finding(issues, "DIRECT_REJECT_OR_RESERVED_CHOICE")
            return
        if name in visited:
            return
        item = objects.get(name)
        if not item:
            finding(issues, "UNRESOLVED_PROXY_REFERENCE")
            return
        obj, loc, field = item
        visiting.add(name)
        if field == "proxy-groups":
            if obj.get("type") not in GROUP_TYPES:
                finding(issues, "UNKNOWN_GROUP_TYPE", location=loc)
            if obj.get("use") or obj.get("include-all") or obj.get("include-all-proxies") or obj.get("include-all-providers"):
                finding(issues, "DYNAMIC_GROUP_MEMBERS_REQUIRE_EXPANDED_EXPORT", location=loc)
            members = obj.get("proxies")
            if not isinstance(members, list) or not members or not all(isinstance(m, str) for m in members):
                finding(issues, "EMPTY_OR_UNKNOWN_GROUP_MEMBERS", location=loc)
            else:
                for member in members:
                    visit(member, depth + 1)
        else:
            if obj.get("type") not in LEAF_TYPES:
                finding(issues, "UNKNOWN_OR_DIRECT_PROXY_TYPE", location=loc)
            if not isinstance(obj.get("server"), str) or not obj["server"]:
                finding(issues, "NODE_ENDPOINT_UNVERIFIED", location=loc)
            if obj.get("dialer-proxy"):
                if isinstance(obj["dialer-proxy"], str):
                    visit(obj["dialer-proxy"], depth + 1)
                else:
                    finding(issues, "INVALID_DIALER_REFERENCE", location=loc)
            if request["ipv6"] == "block":
                try:
                    if ipaddress.ip_address(obj.get("server", "")).version == 6:
                        finding(issues, "IPV6_NODE_CONFLICTS_WITH_BLOCK_PROFILE", location=loc)
                except (ValueError, TypeError):
                    finding(issues, "NODE_ADDRESS_FAMILY_REQUIRES_BOOTSTRAP_TEST", "review", loc)
            if obj.get("skip-cert-verify") is True:
                finding(issues, "NODE_TLS_VERIFICATION_DISABLED", location=loc)
        visiting.remove(name)
        visited.add(name)
    visit(request["group"])
    if request["bootstrap"]["mode"] == "deny":
        # A global bootstrap change can break OTHER groups and provider refresh too.
        for obj, loc, field in objects.values():
            if field != "proxies":
                continue
            try:
                ipaddress.ip_address(obj.get("server", ""))
            except (ValueError, TypeError):
                finding(issues, "HOSTNAME_NODE_NEEDS_BOOTSTRAP_OR_VERIFIED_PIN", location=loc)
        if config.get("proxy-providers"):
            finding(issues, "PROVIDER_COLD_START_UNVERIFIED", location="proxy-providers")
    else:
        finding(issues, "DIRECT_BOOTSTRAP_EXCEPTION_NOT_ALL_DNS_PROXIED", "review")
        if request["bootstrap"]["mode"] == "plaintext-direct":
            finding(issues, "PLAINTEXT_NODE_LOOKUP_VISIBLE_ON_PATH", "review")
    return issues


def check_config(config: dict, request: dict) -> list:
    issues = check_graph(config, request)
    routing = request.get("routing", "rule")
    if routing == "rule" and config.get("mode") != "rule":
        finding(issues, "NOT_RULE_MODE", location="mode")
    elif routing == "global" and config.get("mode") != "global":
        finding(issues, "NOT_GLOBAL_MODE", location="mode")
    elif routing == "global":
        finding(issues, "GLOBAL_MODE_DOES_NOT_EVALUATE_PREPEND_RULES", "review", "mode")
    dns, tun = config.get("dns"), config.get("tun")
    if not isinstance(dns, dict) or not isinstance(tun, dict):
        finding(issues, "NEED_FULL_EFFECTIVE_DNS_AND_TUN_MAPS")
        return issues
    if dns.get("enable") is not True:
        finding(issues, "DNS_DISABLED_USES_SYSTEM", location="dns.enable")
    if tun.get("enable") is not True or tun.get("auto-route") is not True:
        finding(issues, "TUN_OR_AUTO_ROUTE_DISABLED", location="tun")
    hijack = tun.get("dns-hijack", [])
    if not isinstance(hijack, list) or not {"any:53", "tcp://any:53"}.issubset(hijack):
        finding(issues, "UDP_TCP_53_CAPTURE_NOT_CONFIGURED", location="tun.dns-hijack")
    if dns.get("prefer-h3") is True:
        finding(issues, "H3_TRANSPORT_REQUIRES_SEPARATE_UDP_TEST", "review", "dns.prefer-h3")
    if dns.get("enhanced-mode") != "fake-ip":
        finding(issues, "REAL_IP_MODE_REQUIRES_DOMAIN_VISIBILITY_TEST", "review", "dns.enhanced-mode")
    if request["ipv6"] == "tunnel" and (config.get("ipv6") is not True or dns.get("ipv6") is not True):
        finding(issues, "IPV6_TUNNEL_FLAGS_MISSING", location="ipv6")
    if request["ipv6"] == "block" and (config.get("ipv6") is not False or dns.get("ipv6") is not False):
        finding(issues, "IPV6_BLOCK_PROFILE_FLAGS_MISSING", location="ipv6")
    finding(issues, "NATIVE_IPV6_AND_CRASH_ISOLATION_REQUIRE_DEVICE_TEST", "review")
    for key in ("route-address", "route-exclude-address", "route-address-set", "route-exclude-address-set",
                "include-interface", "exclude-interface", "include-uid", "exclude-uid", "include-uid-range", "exclude-uid-range"):
        if tun.get(key):
            finding(issues, "TUN_SCOPE_REQUIRES_REVIEW", "review", "tun." + key)
    try:
        fake = ipaddress.ip_network(dns.get("fake-ip-range", "198.18.0.1/16"), strict=False)
        for excluded in tun.get("route-exclude-address", []):
            net = ipaddress.ip_network(excluded, strict=False)
            if net.version == fake.version and net.overlaps(fake):
                finding(issues, "FAKE_IP_ROUTE_EXCLUDED", location="tun.route-exclude-address")
    except (TypeError, ValueError):
        finding(issues, "INVALID_FAKE_IP_OR_EXCLUDED_ROUTE")
    for key in DNS_LISTS + ("default-nameserver", "proxy-server-nameserver"):
        values = dns.get(key, [])
        if not isinstance(values, list):
            finding(issues, "INVALID_RESOLVER_LIST", location="dns." + key)
            continue
        if key in ("nameserver", "default-nameserver", "proxy-server-nameserver") and not values:
            finding(issues, "REQUIRED_RESOLVER_LIST_EMPTY", location="dns." + key)
        for idx, value in enumerate(values):
            loc = f"dns.{key}[{idx}]"
            if domestic_resolver(value):
                finding(issues, "DOMESTIC_PUBLIC_RESOLVER", location=loc)
                continue
            mode = request["bootstrap"]["mode"]
            if key == "proxy-server-nameserver" and mode == "deny" and value == "rcode://refused":
                continue
            if key == "proxy-server-nameserver" and mode == "deny":
                finding(issues, "BOOTSTRAP_MUST_BE_DENIED", location=loc)
                continue
            if key == "proxy-server-nameserver" and mode == "plaintext-direct":
                try:
                    if plaintext_bootstrap_url(value) not in request["bootstrap"]["resolvers"]:
                        finding(issues, "RESOLVER_NOT_APPROVED_OR_NOT_PINNED", location=loc)
                except ValueError:
                    finding(issues, "UNSAFE_OR_UNSUPPORTED_DNS_TRANSPORT", location=loc)
                continue
            try:
                base, selector = resolver_url(value, allow_selector=True)
                is_bootstrap = key == "proxy-server-nameserver" and mode == "encrypted-direct"
                allowed = request["bootstrap"]["resolvers"] if is_bootstrap else request["resolvers"]
                expected = None if is_bootstrap or request.get("routing") == "global" else request["group"]
                if base not in allowed or selector != expected:
                    finding(issues, "RESOLVER_NOT_APPROVED_OR_NOT_PINNED", location=loc)
            except ValueError:
                finding(issues, "UNSAFE_OR_UNSUPPORTED_DNS_TRANSPORT", location=loc)
    fallback = dns.get("fallback", [])
    filt = dns.get("fallback-filter")
    if isinstance(filt, dict) and filt.get("geoip") is True and (not isinstance(fallback, list) or not fallback):
        finding(issues, "GEOIP_FILTER_WITHOUT_FALLBACK", location="dns.fallback-filter.geoip")
    for key in DNS_MAPS:
        values = dns.get(key, {})
        if not isinstance(values, dict):
            finding(issues, "INVALID_DNS_POLICY_MAP", location="dns." + key)
            continue
        # Indices, never private domain names, appear in audit output.
        for idx, val in enumerate(values.values()):
            loc = f"dns.{key}[{idx}]"
            if key == "proxy-server-nameserver-policy":
                finding(issues, "BOOTSTRAP_POLICY_OVERRIDE_REQUIRES_REVIEW", location=loc)
                continue
            entries = val if isinstance(val, list) else [val]
            if not entries:
                finding(issues, "EMPTY_DNS_POLICY", location=loc)
            for entry in entries:
                try:
                    base, selector = resolver_url(entry, True)
                    if base not in request["resolvers"] or selector != request["group"]:
                        finding(issues, "DNS_POLICY_BYPASSES_APPROVED_GROUP", location=loc)
                except ValueError:
                    finding(issues, "DNS_POLICY_BYPASSES_APPROVED_GROUP", location=loc)
    return issues


def build_plan(config: dict, request: dict) -> dict:
    routing = request.get("routing", "rule")
    if routing == "global":
        routed = list(request["resolvers"])
    else:
        routed = [url + "#" + quote(request["group"], safe="") for url in request["resolvers"]]
    boot = request["bootstrap"]["mode"]
    if boot == "deny":
        proxy_ns, profile = ["rcode://refused"], "strict-no-bootstrap"
    elif boot == "encrypted-direct":
        proxy_ns, profile = request["bootstrap"]["resolvers"], "encrypted-bootstrap-exception"
    else:
        proxy_ns, profile = request["bootstrap"]["resolvers"], "plaintext-bootstrap-exception"
    dns = {"enable": True, "respect-rules": True, "prefer-h3": False,
           "enhanced-mode": "fake-ip", "ipv6": request["ipv6"] == "tunnel",
           "default-nameserver": routed, "nameserver": routed, "direct-nameserver": routed,
           "proxy-server-nameserver": proxy_ns,
           "nameserver-policy": {}, "proxy-server-nameserver-policy": {}, "fallback": [],
           "fallback-filter": {"geoip": False, "domain": []}}
    tun = {"enable": True, "auto-route": True, "dns-hijack": ["any:53", "tcp://any:53"]}
    if not isinstance(config.get("dns", {}), dict) or not isinstance(config.get("tun", {}), dict):
        raise ValueError("dns/tun must be maps in the effective profile")
    if not config.get("dns", {}).get("fake-ip-range"):
        dns["fake-ip-range"] = "198.18.0.1/16"
    old_hijack = config.get("tun", {}).get("dns-hijack", [])
    if not isinstance(old_hijack, list) or not all(isinstance(x, str) for x in old_hijack):
        raise ValueError("Invalid existing DNS hijack list")
    tun["dns-hijack"] = list(dict.fromkeys(old_hijack + tun["dns-hijack"]))
    candidate = {"mode": routing, "ipv6": request["ipv6"] == "tunnel", "dns": dns, "tun": tun}
    effective = copy.deepcopy(config)
    for key in ("dns", "tun"):
        effective.setdefault(key, {}).update(candidate[key])
    effective.update({"mode": routing, "ipv6": candidate["ipv6"]})
    issues = check_config(effective, request)
    finding(issues, "REPLACE_POLICY_MAPS_NOT_RECURSIVE_MERGE", "review")
    if any(config.get("dns", {}).get(k) for k in DNS_MAPS):
        finding(issues, "EXISTING_SPLIT_DNS_REMOVAL_NEEDS_APPROVAL",
                "review" if request["replace_existing_dns_policies"] else "error")
    finding(issues, "FAKE_IP_RANGE_MUST_NOT_OVERLAP_REAL_LAN_OR_VPN", "review")
    blocked = any(i["severity"] == "error" for i in issues)
    return {"schema_version": 1, "status": "BLOCKED" if blocked else "REVIEW_REQUIRED",
            "privacy_profile": profile,
            "runtime_verdict": "UNVERIFIED", "findings": issues,
            "candidate_fragment": None if blocked else candidate,
            "rules_extension": None if blocked else {"prepend": ["DOMAIN-SUFFIX," + t + "," + request["group"] for t in request["targets"]], "append": [], "delete": []},
            "merge_contract": {"replace_maps": ["dns." + k for k in DNS_MAPS] + ["dns.fallback-filter"],
                               "replace_lists": ["dns." + k for k in DNS_LISTS + ("default-nameserver", "proxy-server-nameserver")],
                               "preserve": ["subscription", "nodes", "credentials", "ports", "dns.listen", "dns.fake-ip-filter", "tun.stack", "tun.mtu", "unrelated rules"],
                               "note": "An empty map in a recursive GUI merge may NOT clear old entries; re-audit the generated effective profile"},
            "pending_device_checks": PENDING,
            "limitations": ["Plan only; not a complete profile or service-region guarantee", "Do not set OS DNS to an unverified listener", "IPv6 flags do not block native OS IPv6", "System/browser changes require separate scope and rollback", "Do not overwrite the live generated profile"]}


def proxy_endpoint(value: str) -> str:
    try:
        u = urlsplit(value)
        if (u.scheme not in ("http", "https", "socks5h") or u.username is not None or u.password is not None
                or not ipaddress.ip_address(u.hostname or "").is_loopback or not u.port
                or u.path or u.query or u.fragment or any(c.isspace() or ord(c) < 32 for c in value)):
            raise ValueError
    except (ValueError, TypeError):
        raise ValueError("Use an existing numeric-loopback HTTP/HTTPS/socks5h proxy with explicit port; no credentials") from None
    return value


def dns_query(name: str, qtype: int, txid: int) -> bytes:
    name = hostname(name)
    if qtype not in (1, 28):
        raise ValueError("Only A and AAAA queries are supported")
    question = b"".join(bytes([len(label)]) + label.encode("ascii") for label in name.split(".")) + b"\0"
    return struct.pack("!6H", txid, 0x0100, 1, 0, 0, 0) + question + struct.pack("!2H", qtype, 1)


def dns_name(data: bytes, offset: int) -> tuple[str, int]:
    labels, seen, end = [], set(), None
    for _ in range(128):
        if offset >= len(data) or offset in seen:
            raise ValueError("Malformed DNS name")
        seen.add(offset)
        length = data[offset]
        if length & 0xC0 == 0xC0:
            if offset + 1 >= len(data):
                raise ValueError("Truncated DNS pointer")
            if end is None:
                end = offset + 2
            offset = ((length & 0x3F) << 8) | data[offset + 1]
            continue
        if length & 0xC0:
            raise ValueError("Unsupported DNS label")
        offset += 1
        if not length:
            name = ".".join(labels)
            if len(name) > 253:
                raise ValueError("DNS name too long")
            return name.lower(), end if end is not None else offset
        if offset + length > len(data):
            raise ValueError("Truncated DNS label")
        labels.append(data[offset:offset + length].decode("ascii"))
        offset += length
    raise ValueError("Excessive DNS pointers")


def dns_response(data: bytes, txid: int, name: str, qtype: int) -> dict:
    if not 12 <= len(data) <= 65535:
        raise ValueError("Invalid DNS response size")
    rid, flags, qd, an, ns, ar = struct.unpack("!6H", data[:12])
    if rid != txid or not flags & 0x8000 or flags & 0x7800 or flags & 0x0200 or qd != 1 or an + ns + ar > 512:
        raise ValueError("Mismatched, truncated, or unsupported DNS response")
    question, offset = dns_name(data, 12)
    if question != hostname(name) or offset + 4 > len(data) or struct.unpack("!2H", data[offset:offset + 4]) != (qtype, 1):
        raise ValueError("DNS question mismatch")
    offset += 4
    answers = {"A": 0, "AAAA": 0}
    for index in range(an + ns + ar):
        _, offset = dns_name(data, offset)
        if offset + 10 > len(data):
            raise ValueError("Truncated DNS record")
        kind, cls, _, size = struct.unpack("!HHIH", data[offset:offset + 10])
        offset += 10
        if offset + size > len(data) or (kind == 1 and size != 4) or (kind == 28 and size != 16):
            raise ValueError("Invalid DNS record size")
        if index < an and cls == 1 and kind in (1, 28):
            answers["A" if kind == 1 else "AAAA"] += 1
        offset += size
    if offset != len(data):
        raise ValueError("Unexpected trailing DNS bytes")
    rcode = flags & 15
    return {"rcode": rcode, "result": "ANSWER" if rcode == 0 and answers["A" if qtype == 1 else "AAAA"] else
            "NODATA" if rcode == 0 else "NXDOMAIN" if rcode == 3 else "DNS_ERROR", "answer_counts": answers}


def doh_probe(proxy: str, resolver: str, name: str, qtype: int) -> dict:
    proxy_endpoint(proxy)
    resolver, _ = resolver_url(resolver)
    if not resolver.startswith("https://"):
        raise ValueError("Wire probe supports DoH only; DoT requires a separate path test")
    executable = shutil.which("curl.exe" if os.name == "nt" else "curl")
    if not executable:
        return {"status": "UNVERIFIED", "reason": "curl unavailable"}
    txid = secrets.randbelow(65536)
    payload = dns_query(name, qtype, txid)
    argv = [executable, "-q", "--silent", "--show-error", "--fail", "--connect-timeout", "4",
            "--max-time", "10", "--max-filesize", "65535", "--proto", "=https", "--proxy", proxy,
            "--noproxy", "", "--header", "Content-Type: application/dns-message",
            "--header", "Accept: application/dns-message", "--data-binary", "@-",
            "--write-out", "\n%{http_code}\t%{content_type}\n", resolver]
    env = {k: v for k, v in os.environ.items() if k.lower() not in {"http_proxy", "https_proxy", "all_proxy", "no_proxy", "sslkeylogfile"}}
    try:
        result = subprocess.run(argv, input=payload, capture_output=True, check=False, timeout=12, env=env)
        if result.returncode:
            return {"status": "UNVERIFIED", "curl_exit": result.returncode, "reason": "Request failed; no direct fallback; raw errors withheld"}
        if len(result.stdout) > 66048:
            raise ValueError("Oversize DoH output")
        wire, meta, tail = result.stdout.rsplit(b"\n", 2)
        code, content_type = meta.split(b"\t", 1)
        if tail or code != b"200" or content_type.split(b";", 1)[0].strip().lower() != b"application/dns-message":
            raise ValueError("Unexpected HTTP status or DNS MIME type")
        answer = dns_response(wire, txid, name, qtype)
        return {"status": "FAIL" if answer["result"] == "DNS_ERROR" else "OBSERVED", **answer,
                "note": "Only the local proxy listener was used; its final DIRECT/proxy leaf, core DNS settings, OS capture and resolver geography remain unverified"}
    except (OSError, subprocess.TimeoutExpired, ValueError, UnicodeError, struct.error):
        return {"status": "UNVERIFIED", "reason": "Unavailable or invalid DoH response; no direct retry; raw data withheld"}


def emit(data: dict):
    # UTF-8 even with a redirected Windows legacy code page.
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if hasattr(sys.stdout, "buffer"):
        sys.stdout.buffer.write(text.encode("utf-8"))
    else:
        sys.stdout.write(text)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for cmd in ("plan", "audit"):
        p = sub.add_parser(cmd, help="Offline only; never edits or loads a profile")
        p.add_argument("--config", type=Path, required=True, help="Private full effective YAML or JSON profile, not a partial controller /configs snapshot")
        p.add_argument("--request", type=Path, required=True, help="Explicit policy request JSON")
    probe_parser = sub.add_parser("probe", help="Explicit-proxy RFC8484 DoH path test; no OS interception claim")
    probe_parser.add_argument("--network", action="store_true", help="Authorize remote resolver to see the query and proxy exit IP")
    probe_parser.add_argument("--proxy", required=True)
    probe_parser.add_argument("--resolver", required=True, help="Explicit public numeric https:// DoH URL; no automatic provider choice")
    probe_parser.add_argument("--domain", required=True)
    probe_parser.add_argument("--qtype", choices=("A", "AAAA", "both"), default="both")
    args = parser.parse_args(argv)
    try:
        if args.command in ("plan", "audit"):
            config, fingerprint = load_document(args.config, with_digest=True)
            request = policy_request(load_document(args.request))
            if args.command == "plan":
                report = build_plan(config, request)
                report["input_profile_sha256"] = fingerprint
                code = 1 if report["status"] == "BLOCKED" else 0
            else:
                issues = check_config(config, request)
                blocked = any(i["severity"] == "error" for i in issues)
                report = {"schema_version": 1, "status": "BLOCKED" if blocked else "UNVERIFIED",
                          "findings": issues, "pending_device_checks": PENDING,
                          "note": "Static audit cannot certify DNS privacy, application access or fail-closed behavior"}
                code = 1 if blocked else 3
        else:
            if not args.network:
                parser.error("probe requires --network; remote resolver sees the query and exit IP")
            proxy_endpoint(args.proxy)
            base, _ = resolver_url(args.resolver)
            name = hostname(args.domain)
            if not base.startswith("https://"):
                raise ValueError("probe requires an HTTPS DoH resolver")
            types = (1, 28) if args.qtype == "both" else (1,) if args.qtype == "A" else (28,)
            results = [{"qtype": "A" if t == 1 else "AAAA", **doh_probe(args.proxy, base, name, t)} for t in types]
            report = {"schema_version": 1, "runtime_verdict": "UNVERIFIED", "network_requested": True,
                      "probes": results, "note": "Domain, addresses and raw DNS payloads withheld; AAAA is a record type, not the transport IP family"}
            code = 1 if any(r["status"] == "FAIL" for r in results) else 3
        emit(report)
        return code
    except (ValueError, TypeError, RecursionError):
        # Do not echo user/config values (could include a subscription or secret).
        emit({"schema_version": 1, "status": "INPUT_ERROR", "message": "Invalid/unsupported input; consult --help and dns-workflow.md. Raw values withheld."})
        return 2


if __name__ == "__main__":
    sys.exit(main())
