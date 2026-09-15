"""Deterministic server/controller documentation and protected plaintext delivery bundles."""
from __future__ import annotations
import base64, copy, html, json, re, shlex
from pathlib import Path
from .core import *

STANDARD="""# OPS 部署与持久化规范

APP 和公共服务同级：host_root/project_id。明确启用多实例时使用 project_id/instances/environment/instance。

每个项目的 compose 或 service、env、config、data、logs、backups、releases 和 README 聚合在该项目目录。业务数据必须位于 data/component/purpose；不能回退到临时目录、代码目录、用户默认目录、匿名卷或命名卷。Docker 全局 data-root 另登记在 host_root/_runtime/docker；既有引擎迁移必须单独审批。

README 记录实际版本、来源、主机、时间、路径、依赖、启停和备份恢复。它默认不含密码。OPERATIONS.md 和部署机明文账本按策略保存真实账号密码，权限必须限制；不得进入 Git、镜像构建上下文、Web 静态目录或普通日志。

共享服务拥有物理数据；APP 只拥有获批的逻辑数据库、桶、命名空间和应用账号。复制 APP 目录不是共享依赖完整备份。卸载 APP 不删除公共服务、共享网络、逻辑资源或任何数据。单 APP 回滚不允许恢复整个共享实例。

旧环境默认值恢复和健康验证失败不得清理原环境。缓存隔离不等于释放空间；禁止把 data/env/backups 或数据库持久日志当成垃圾。

计划 → 明确批准 → 执行 → 实际验证 → 双边文档回执完成。远程断线意味着结果未知，不能重跑迁移或重新生成密码。
"""

def code(value) -> str:
    s=str(value)
    return "<code>"+html.escape(s).replace("\n","<br>")+"</code>"

def block(value,language="json") -> str:
    text=json.dumps(value,ensure_ascii=False,indent=2) if not isinstance(value,str) else value
    ticks="`"*max(3,max((len(x) for x in re.findall(r"`+",text)),default=0)+1)
    return ticks+language+"\n"+text+"\n"+ticks+"\n"

def path_for(status,dep,relative_name):
    return target_join({**status["hosts"][dep["host_id"]],"root":dep["root"]},relative_name)

def credential_refs(status,dep):
    refs=set(dep["credential_refs"])
    for b in status["bindings"].values():
        if b["status"]=="active" and b["consumer_deployment_id"]==dep["deployment_id"]:refs.add(b["credential_ref"])
    for a in status["allocations"].values():
        if a["provider_deployment_id"]==dep["deployment_id"] and a["status"]!="retired":refs.add(a["credential_ref"])
    return sorted(refs)

def credentials_text(refs,ledger):
    out=["## 明文账号密码\n","本文件是受限明文交付，不是脱敏报告。只向获授权管理员及对应运行账户开放。\n"]
    if not refs:return "\n".join(out+["本部署没有登记密码凭据。密钥认证本身不存在登录密码；未知旧密码不能伪造。\n"])
    for ref in refs:
        cid,v=ref.split("@")
        try:item=ledger["entries"][cid][v]
        except KeyError:raise OpsError("document delivery blocked by missing credential: "+ref)
        out.extend(["### "+ref+"\n",code(item["purpose"])+"\n"])
        for key,value in item["values"].items():out.extend(["**"+key+"**\n",block(value,"text")])
    return "\n".join(out)

def dependencies(status,dep):
    lines=["## 依赖与数据归属\n"]
    bindings=[b for b in status["bindings"].values() if b["consumer_deployment_id"]==dep["deployment_id"] and b["status"]=="active"]
    if not bindings:lines.append("未登记共享或外部服务依赖；专用组件的数据仍归本项目目录。\n")
    for b in bindings:
        lines += ["### "+b["component"]+" / "+b["binding_id"]+"\n",f"模式：{b['mode']}；端点：{code(b['endpoint'])}；网络：{code(b['network'])}。\n"]
        if b["mode"]=="shared":
            a=status["allocations"][b["allocation_id"]];provider=status["deployments"][b["provider_deployment_id"]]
            lines.append(f"提供者：{provider['project_id']} / {provider['deployment_id']}，主机 {provider['host_id']}；服务目录 {code(provider['root'])}。\n")
            lines.append(f"逻辑资源：{code(a['resource_name'])}（{a['resource_kind']}）；数据组 {a['data_group']}；账号版本 {a['credential_ref']}；恢复粒度 {a['recovery_scope']}。\n")
            for storage in provider["storage"]:lines.append(f"提供者物理路径：{code(storage['path'])}（{storage['component']}/{storage['purpose']}）。\n")
            lines.append("公共服务的物理数据不复制到 APP 目录；单 APP 恢复不得覆盖其他消费者。\n")
    consumers=[b for b in status["bindings"].values() if b["provider_deployment_id"]==dep["deployment_id"] and b["status"]=="active"]
    if consumers:
        lines.append("## 公共服务消费者\n\n| APP 实例 | 所在主机 | 分配 | 凭据版本 |\n|---|---|---|---|\n")
        for b in consumers:
            consumer=status["deployments"][b["consumer_deployment_id"]]
            lines.append(f"| {consumer['deployment_id']} | {consumer['host_id']} | {b['allocation_id']} | {b['credential_ref']} |\n")
    return "\n".join(lines)

def deployment_readme(status,dep,run_id,generated_at,*,ledger=None,include_credentials=False,controller=False):
    host=status["hosts"][dep["host_id"]];project=status["projects"][dep["project_id"]]
    out=[f"# {project['display_name']} — {dep['deployment_id']}\n",
         f"文档代次：{run_id}；生成时间（UTC）：{generated_at}。部署验证与双边交付以部署机对应运行记录和 docs-receipt.json 为准。\n",
         "## 部署事实\n\n| 项目 | 值 |\n|---|---|",
         f"| 主机 / 账户 | {host['host_id']} / {code(host['connection'].get('username','本机执行账户'))} |",
         f"| 连接 | {code(host['connection'].get('hostname','local'))}，SSH 端口 {host['connection'].get('port','不适用')} |",
         f"| 类型 / 方式 | {project['kind']} / {dep['method']} |",
         f"| 生命周期状态 | {dep['status']} |",
         f"| 环境 / 实例 | {dep['environment']} / {dep['instance']} |",
         f"| 计划版本 | {code(dep['version'])} |",
         f"| 最后运行验证版本 | {code(dep.get('observed_version') or '尚未验证')} |",
         f"| 首次部署时间（UTC） | {dep['installed_at'] or '尚未完成'} |",
         f"| 最近部署验证时间（UTC） | {dep['updated_at'] or '尚未验证'} |",
         f"| 项目根目录 | {code(dep['root'])} |",
         f"| 来源 | {code(dep['source']['location'])} |",
         f"| 固定来源版本 | {code(dep['source']['revision'])} |\n",
         "## 目录与持久化\n",
         f"部署定义：{code(path_for(status,dep,'compose/compose.yaml') if dep['method']=='compose' else path_for(status,dep,'service'))}。\n",
         f"环境文件：{code(path_for(status,dep,'env'))}；配置：{code(path_for(status,dep,'config'))}。\n",
         f"日志：{code(path_for(status,dep,'logs'))}；发布历史：{code(path_for(status,dep,'releases'))}；备份：{code(path_for(status,dep,'backups'))}。\n",
         "| 组件 | 用途 | 自有持久化路径 |\n|---|---|---|"]
    for p in dep["storage"]:out.append(f"| {p['component']} | {p['purpose']} | {code(p['path'])} |")
    if not dep["storage"]:out.append("| — | 无登记的业务持久化内容 | 不应生成匿名数据路径 |")
    out += ["\n"+dependencies(status,dep),"## 日常操作\n"]
    for title,key in (("启动/运行","start"),("停止（保留数据）","stop"),("查看与验证","verify")):
        out.append("### "+title+"\n")
        if not dep["commands"][key]:out.append("不适用或由已批准运行计划执行。\n")
        for argv in dep["commands"][key]:
            # argv JSON is unambiguous on both POSIX and Windows, without shell quotation ambiguity.
            out.append(block(argv))
    out += ["## 更新步骤\n","先盘点主机与依赖；固定版本；检查备份及恢复能力；生成新计划并确认；分批执行；验证运行与数据；核对服务端和部署机文档回执。不得直接删除 data/env/backups，也不得用旧批准授权新迁移。\n",
            "## 备份\n",dep["backup"]+"\n","## 恢复与回滚\n",dep["recovery"]+"\n",
            "切换旧代码不能自动恢复数据库结构。共享服务整实例恢复需要全部消费者维护审批。\n"]
    if dep["notes"]:out += ["## 限制与备注\n", "\n\n".join(dep["notes"])+"\n"]
    replicas=[d for d in status["deployments"].values() if d["project_id"]==dep["project_id"]]
    out += ["## 同项目部署位置\n", "\n".join(f"- {d['host_id']} / {d['deployment_id']}：{code(d['root'])}" for d in sorted(replicas,key=lambda x:x["deployment_id"]))+"\n"]
    if controller:
        out.append("\n本目录是部署机的配置、凭据、运行证据和远端文档记录；不声称自动复制了远端业务数据。数据备份需要独立的备份策略和回执。\n")
    if include_credentials:out.append(credentials_text(credential_refs(status,dep),ledger))
    else:out.append("\n## 凭据记录\n\n本 README 默认不写密码。获授权管理员读取本项目 OPERATIONS.md（启用时）或部署机明文手册；密码未知时必须补齐，不能编造。\n")
    return "\n".join(out)+"\n"

def host_readme(status,hid,run_id,at,*,ledger=None,full=False,controller=False):
    host=status["hosts"][hid]
    out=[f"# 主机 {host['display_name']} / {hid}\n",f"主机持久化根：{code(host['root'])}；更新：{at}；运行：{run_id}。\n",
         "APP 与公共服务同级。通用规范见 docs/standards/DEPLOYMENT-STANDARD.md。DEPLOYMENTS.md 为本机部署手册。\n",
         "| APP / 服务 | 实例 | 版本（最近验证） | 目录 | 最近验证时间 |\n|---|---|---|---|---|"]
    deps=sorted([d for d in status["deployments"].values() if d["host_id"]==hid],key=lambda d:d["deployment_id"])
    for d in deps:out.append(f"| {d['project_id']} | {d['deployment_id']} | {code(d.get('observed_version') or '未验证')} | {code(d['root'])} | {d['updated_at'] or '未验证'} |")
    out.append("\n公共服务数据归提供者；其他主机使用的服务通过依赖绑定记录，不在本机创建假的空服务目录。\n")
    if full:
        for d in deps:out.append(deployment_readme(status,d,run_id,at,ledger=ledger,include_credentials=controller or status["policies"]["server_operations"]))
    return "\n".join(out)+"\n"

def remote_paths(status,dep):
    names=["README.md","project.yaml","run/release-state.json"]
    if status["policies"]["server_operations"]:names.append("OPERATIONS.md")
    if status["projects"][dep["project_id"]]["kind"]=="shared-service":names.append("consumers.md")
    if dep["layout"]=="instances":
        return [path_for(status,dep,n) for n in names]+[target_join(status["hosts"][dep["host_id"]],dep["project_id"]+"/README.md")]
    return [path_for(status,dep,n) for n in names]

def plan_report(plan):
    out=[f"# OPS 执行计划 {plan['run_id']}\n",f"Worker：{plan['worker']}；操作：{plan['operation']}；风险：{plan['risk']}。\n",
         f"计划摘要：`{digest(plan)}`\n\n创建：{plan['created_at']}；批准有效截止：{plan['expires_at']}。\n",
         "## 目标与理由\n",plan["reason"]+"\n"]
    for hid,h in plan["hosts"].items():out.append(f"主机 {hid}：{h['transport']} / {h['platform']} / 根 {code(h['root'])} / 身份 {h['identity']}。\n")
    out += ["## 受影响消费者\n",", ".join(plan["affected_consumers"]) or "没有登记的既有消费者受影响。","\n## 完整动作集合\n"]
    for op in plan["operations"]:
        out += [f"### {op['step_id']} — {op['host_id']} / {op.get('deployment_id') or 'host'} / {op['kind']}\n"]
        display={k:v for k,v in op.items() if k not in ("content_b64",)}
        if "content_b64" in op:display["payload_sha256"]=digest(base64.b64decode(op["content_b64"]))
        # Placeholders are not secrets; retain them so the account version/write set is reviewable.
        out.append(block(display))
        if op.get("secret_argv_acknowledged"):out.append("**该 MinIO 管理动作的应用密码会短暂出现在受特权用户可见的 mc 子进程参数中。批准包含此风险。**\n")
    out += ["## 明文文件与双边交付\n","服务器 README 默认不含密码；受限 OPERATIONS.md 和部署机手册按已批准策略写真实明文。env 和本地配置副本按 0600/受限 ACL 写入。目标与部署机文件均回读校验；缺一不可标记 completed。\n",
            block({"document_targets":plan["document_targets"],"credential_versions":list(plan["credential_versions"]),"policies":plan["registry_after"]["policies"]}),
            "## 数据保护和恢复\n",plan["rollback_note"]+"\n",
            "没有默认删除数据、逻辑资源、公共服务、卷或备份的动作。失败停止，断线标记 unknown；同一计划不能盲目重跑迁移。\n",
            "## 批准\n","必须由用户确认上述目标、完整写入集合、凭据版本、影响集合和恢复限制。approve 必须携带本报告对应的完整摘要；编辑计划会使旧批准失效。\n"]
    return "\n".join(out)

def delivery_bundle(state,plan,status,ledger,verified_ids):
    at=now();rid=plan["run_id"];remote={};local={}
    def add_remote(hid,path,text):
        try:expected=plan["document_preconditions"][hid][path]
        except KeyError:raise OpsError("document write not included in approved preconditions: "+path)
        remote[(hid,path)]={"host_id":hid,"path":path,"content":text,"sha256":digest(text.encode()),"expected":expected}
    for did in sorted(set(verified_ids)):
        d=status["deployments"][did];hid=d["host_id"]
        readme=deployment_readme(status,d,rid,at,ledger=ledger,include_credentials=status["policies"]["server_readme_credentials"])
        add_remote(hid,path_for(status,d,"README.md"),readme)
        operations=deployment_readme(status,d,rid,at,ledger=ledger,include_credentials=True)
        if status["policies"]["server_operations"]:add_remote(hid,path_for(status,d,"OPERATIONS.md"),operations)
        add_remote(hid,path_for(status,d,"project.yaml"),json.dumps(d,ensure_ascii=False,indent=2)+"\n")
        add_remote(hid,path_for(status,d,"run/release-state.json"),json.dumps({"run_id":rid,"version":d["version"],"observed_version":d.get("observed_version"),"verified_at":d["updated_at"],"document_generation":at},ensure_ascii=False,indent=2)+"\n")
        if status["projects"][d["project_id"]]["kind"]=="shared-service":add_remote(hid,path_for(status,d,"consumers.md"),dependencies(status,d))
        if d["layout"]=="instances":
            projectroot=target_join(status["hosts"][hid],d["project_id"])
            peers=[x for x in status["deployments"].values() if x["host_id"]==hid and x["project_id"]==d["project_id"]]
            text="# "+d["project_id"]+" 实例索引\n\n"+"\n".join(f"- {x['environment']}/{x['instance']}：{code(x['root'])}，版本 {code(x['version'])}" for x in peers)+"\n"
            add_remote(hid,target_join({**status["hosts"][hid],"root":projectroot},"README.md"),text)
        prefix=f"hosts/{hid}/deployments/{did}"
        local[prefix+"/README.md"]=deployment_readme(status,d,rid,at,ledger=ledger,include_credentials=True,controller=True)
        local[prefix+"/OPERATIONS.md"]=operations
        local[prefix+"/deployment.json"]=json.dumps(d,ensure_ascii=False,indent=2)+"\n"
        local[prefix+"/server/README.md"]=readme
    touched_hosts=sorted({status["deployments"][d]["host_id"] for d in verified_ids}|set(plan["hosts"]))
    for hid in touched_hosts:
        h=status["hosts"][hid]
        add_remote(hid,target_join(h,"README.md"),host_readme(status,hid,rid,at))
        add_remote(hid,target_join(h,"DEPLOYMENTS.md"),host_readme(status,hid,rid,at,ledger=ledger,full=True))
        add_remote(hid,target_join(h,"docs/standards/DEPLOYMENT-STANDARD.md"),STANDARD)
        knowledge_path=target_join(h,"knowledge/INDEX.md")
        if plan["document_preconditions"][hid].get(knowledge_path,{"kind":"file"})["kind"]=="absent":
            add_remote(hid,knowledge_path,"# 共享知识索引\n\n通用规范见 ../docs/standards/DEPLOYMENT-STANDARD.md。只收录经用户确认、带来源和最后验证时间的知识，不存密码。\n")
        local[f"hosts/{hid}/README.md"]=host_readme(status,hid,rid,at)
        local[f"hosts/{hid}/DEPLOYMENTS.md"]=host_readme(status,hid,rid,at,ledger=ledger,full=True,controller=True)
    global_text=["# 全域部署总册（明文）\n",f"最近文档代次：{rid}；生成时间：{at}。\n","本地账本和配置副本不等于远端业务数据备份。\n"]
    for hid in sorted(status["hosts"]):global_text.append(host_readme(status,hid,rid,at,ledger=ledger,full=True,controller=True))
    local["FLEET-DEPLOYMENTS.md"]="\n".join(global_text)
    local["README.md"]="# OPS 控制端\n\n主机记录位于 hosts/<host_id>/；项目关联位于 status.json；项目部署记录位于 hosts/<host_id>/deployments/<deployment_id>/；完整明文总册位于 FLEET-DEPLOYMENTS.md；凭据账本位于 private/credentials.json；执行证据按 host runs / release 保存。\n\n不得清理此运行态目录来替换静态 workflow。双边文档完成由每次运行 docs-receipt.json 证明。\n"
    local["docs/standards/DEPLOYMENT-STANDARD.md"]=STANDARD
    if not (state/"knowledge/INDEX.md").exists():local["knowledge/INDEX.md"]="# 共享知识索引\n\n只收录经用户批准、带来源与最后验证日期的通用知识。运行时环境和密码不自动提升为共享知识。\n"
    return {"schema_version":1,"run_id":rid,"plan_digest":digest(plan),"generated_at":at,
            "remote":list(remote.values()),"local":[{"path":p,"content":text,"sha256":digest(text.encode())} for p,text in local.items()],"acks":{}}
