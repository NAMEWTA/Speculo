---
name: job-application
description: "扫描指定知识库建成经历原件，再按岗位派生投递简历（md/docx/pdf）、3–4分钟自我介绍、经历绑定的预测题与提升计划。用户说求职、改简历、投递、JD定制、自我介绍、面试题、提升计划、经历库、知识库扫盘、/job-application 时使用。不编造知识库里没有的数字、职级或技能。"
license: MIT
---

# 岗位投递与面试准备

经历原件是资产，每次投递是衍生品。本文件足够开工；细则按需读 `references/`。不要把用户笔记、简历正文或电话邮箱写进本技能目录。

## 强制入口

`$SKILL_DIR` 是本 `SKILL.md` 所在文件夹（安装后常见 `~/.agents/skills/job-application`、`~/.claude/skills/job-application`，或项目里的对应目录）。运行根是当前会话的工作区，不是技能仓，也不是用户家目录。

每次激活先解析路径，再选模式。解析顺序（高 → 低），`persist_root` 与 `kb_root` 分开取：

1. 用户本轮明确给出的路径
2. 已能定位的 `$persist_root/config.json`
3. `$SKILL_DIR/config.json`
4. 停下来问。**禁止猜测**，禁止默默写到 `$HOME` 或技能仓库根

用户说「就用当前目录」时，`persist_root` = `<cwd>/job-application`。第一次运行必须确认 `kb_root` 和 `persist_root`，写完 JSON 再扫盘。

确认后双写指针（只含路径和偏好，不含经历）：

```bash
python3 "$SKILL_DIR/scripts/write_config.py" \
  --skill-dir "$SKILL_DIR" \
  --persist-root "<abs>" \
  --kb-root "<abs>" \
  --locale zh \
  --page-budget 2
```

`python3` 不可用时改 `python`。脚本把路径展开成绝对路径，写入 `$SKILL_DIR/config.json` 和 `$persist_root/config.json`。前者被技能内 `.gitignore` 忽略，不要提交。

## 模式路由

| 本轮输入 | 模式 |
|---|---|
| 只有知识库路径 | `ingest` 然后 `master`，停下来问岗位 |
| 已有 corpus，给了 JD / 岗位 | `pack` |
| 两者都有，且 manifest 里的 hash 变了 | 先 `ingest` + `master`，再 `pack` |
| 只要自我介绍，但本轮还没有 tailored | 先 `apply` 再 `pitch` |
| 点名只要题或只要提升计划 | `questions` 或 `improve`；没有 match-report 就先 `apply` |

没有 corpus 不准 `apply`。没有 `claim_id` 的数字、职级、技术名不准进投递稿或自我介绍。

## 产物布局

只写在 `persist_root`。默认是 `<cwd>/job-application/`。

```text
<persist_root>/
  INDEX.md
  config.json
  corpus/
    corpus.md profile.md evidence-map.md stories.md
    strengths.md known-gaps.md framings.md style-memory.md
    methodology-cache.md ingest-log.md
    sources/manifest.json
    sources/excerpts/
  applications/YYYY-MM-DD-<company>-<role>/
    INDEX.md brief.md company-research.md match-report.md
    resume-original.md resume-tailored.md
    resume-tailored.docx resume-tailored.pdf resume-tailored.html
    changelog.md speech.md questions.md story-bank.md
    improvement-plan.md
```

同日同公司同岗位已存在时追加 `-01`，不覆盖。知识库只读：不移动、不改写用户笔记，也不把整库复制进 `persist_root`。

## 模式

### ingest

1. `kb_root` 必须是已存在的目录，否则 `blocked-input`。
2. 跑 `scripts/ingest_kb.py --kb-root ... --out "$persist_root/corpus/sources/manifest.json"`。
3. 先读 manifest 和 `sources/INDEX.md`，再按关键词回读少量原文。单文件文本超过约 200KB 只摘头尾，摘录放 `sources/excerpts/`。禁止把整个知识库灌进上下文。

### master

从 manifest 选源，按 [templates/](templates/) 写出 `corpus.md`、`profile.md`（19 节标题必须齐全）、`evidence-map.md`、`stories.md`、`known-gaps.md`、`framings.md`。成就库每条有 `C-xxx`。同一事实两个数字时写入缺口并问用户一次，不取较大的那个。用户明确要求时才上网刷新 `methodology-cache.md`；网搜结果不得变成个人成就。冲突以源文件和 evidence-map 为准，不以写得更顺的句子为准。

### apply

冻结 JD 到 `brief.md`。先写 `resume-original.md`（本轮选用的原件切片），再写 `resume-tailored.md`。每条子弹行尾加 `<!-- claim:C-012 -->`。`changelog.md` 写原句、新句、理由、claim_id。`match-report.md` 四表：已覆盖、翻译后覆盖、诚实缺口、明确不写入。然后：

```bash
python3 "$SKILL_DIR/scripts/render_resume.py" \
  --md "$APP/resume-tailored.md" \
  --css "$SKILL_DIR/assets/resume.css" \
  --out-dir "$APP"
python3 "$SKILL_DIR/scripts/validate_claims.py" \
  --evidence "$persist_root/corpus/evidence-map.md" \
  --files "$APP/resume-tailored.md"
```

渲染缺依赖时 HTML/md 仍算内容完成，在回复里写降级，不要编一版「看起来像 PDF」的假文件。

### pitch

读本轮 tailored、brief、story-bank，不按公司文化凭空写通用稿。`speech.md` 含 180–240 秒正本、60–90 秒短版、被打断时的接法、数字对照表、不要讲的内容。数字必须和投递稿同一 claim。

### questions

题从四条交叉来：JD 必须项、本轮每条 bullet、被压缩但库里有的项目、诚实缺口。每题绑定 `story-id`，或明确写「无法作答」。缺口题只给诚实口径，不编故事。

### improve

A 呈现层：本周和 7 天内能改的口径、要补的证据。B 能力层：30/60/90 天可验证出口。禁止建议伪造证书、改在职时间、把他人成果写成独立完成。

### pack

顺序固定：`research`（写入 `company-research.md`）→ `apply` → 渲染 → `pitch` → `questions` → `improve` → `validate_claims.py`。中途失败停在当前步，不删已通过的上游文件。只有岗位名、没有 JD 原文时，可以有限检索补 JD，并在 brief 里标明「非官方原文」。

## 硬规则

1. 指针只写两份 `config.json`。简历、语料、PDF 只写 `persist_root`。
2. 无 `claim_id` 不得出口数字、职级、技术名。缺数字就定性或标 `needs_proof`。
3. 四层语言：事实 / 估计 / 解释 / 呈现选择。投递稿只用事实和已标记的估计。
4. 翻译不是造假。把「写过内部工具」说成「交付过平台」需要语料里真有平台级范围。
5. 背调红线不可改：学历、在职时间、公司名、正式职级、论文署名、开源仓库所有权。
6. JD 有、库无 → 缺口表，不进技能栏。
7. 新事实可以回写 corpus，但必须新增 source 和 claim，并在 changelog 说明。不得在 tailor 时偷偷改原件数字。
8. 公司新闻不是用户的个人成就。
9. 不自动调用本仓库其它 skill。不把 `config.json` 或用户笔记提交进 git。

完整口径见 [references/honesty-gate.md](references/honesty-gate.md)。简历句式、ATS、中文页数见 [references/resume-playbook.md](references/resume-playbook.md)。口播结构见 [references/interview-speech.md](references/interview-speech.md)。

## 回复格式

每次返回：

- 模式
- `persist_root` 与 `kb_root`（绝对路径）
- 已写文件
- 跑过的脚本和退出码
- 未关闭的 `needs_proof`
- 下一步：继续本技能的哪个模式，或结束

只有 `pack` 完成门全过才能说这套投递包做完了。只跑 `pitch` 时，完成只表示自我介绍写完。

## 资源

| 文件 | 何时读 |
|---|---|
| [references/persist-paths.md](references/persist-paths.md) | 路径、JSON 字段、第一次激活 |
| [references/honesty-gate.md](references/honesty-gate.md) | 写任何对外句子之前 |
| [references/ingest-protocol.md](references/ingest-protocol.md) | ingest |
| [references/corpus-schema.md](references/corpus-schema.md) | master / profile 19 节 |
| [references/resume-playbook.md](references/resume-playbook.md) | apply |
| [references/jd-parse.md](references/jd-parse.md) | 拆 JD |
| [references/interview-speech.md](references/interview-speech.md) | pitch |
| [references/question-bank.md](references/question-bank.md) | questions |
| [references/improvement-plan.md](references/improvement-plan.md) | improve |
| [references/rendering.md](references/rendering.md) | 渲染降级 |
| [references/company-research.md](references/company-research.md) | pack 里的公司调研 |
| [scripts/](scripts/) | 扫盘、写指针、渲染、校验主张 |
| [templates/](templates/) | 每个产物的标题骨架 |
