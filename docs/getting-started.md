# 快速入门：从安装到第一个任务

[手册首页](README.md) · [CLI 参数](cli.md) · [常见问题](troubleshooting.md)

## 1. 准备一个项目目录和 AI 宿主

“项目目录”就是你希望保存工作成果的文件夹，可以是已有代码仓库，也可以是专门的学习或内容创作目录。“宿主”是你正在使用的 AI App、编辑器 Agent 或 AI CLI。它需要能够读取项目文件；需要修改或执行时，还要有相应工具权限。

Speculo 的本地安装器需要 Node.js `>=22.22.3 <25`。先在终端检查：

```bash
node --version
npm --version
```

安装 Node 的方式取决于你的系统。使用 Speculo 的 npm 包不要求先安装仓库开发用的 pnpm。若宿主只能聊天、不能访问本地文件，直接看 [Canonical](canonical.md)。

## 2. 安装 Speculo

```bash
npm install -g @namewta/speculo
```

进入自己的项目目录后执行：

```bash
speculo init .
```

向导首屏并列显示 Skills Hub 分类与 Workflows。Enter 进入分类后多选具体 Skill，保存后返回；Workflow 在首屏用 Enter 切换。完成选择后，再选择共用的安装位置（可同时勾选 `.agents/skills/` 和 `.claude/skills/`），最后统一选择一次能力。曝光支持全部、按组、自定义、保留已有选择和全部不曝光；首次默认勾选 `.agents/skills/`，能力范围默认不曝光；刷新时恢复上次的位置与统一清单。未选 Hub 包时，空选位置会关闭全部曝光并跳过能力选择；已选 Hub 包必须指定至少一个位置。自定义时可以只选择几个 Work 或 Command，总入口独立勾选。最后会显示安装及入口新增、保留、移除和冲突的摘要，确认后才应用变更。

也可以用参数预填领域和入口范围；交互终端会跳过已提供的选项：

```bash
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
```

这里的 `.` 表示当前目录；`specdev` 表示安装开发领域；`--skill-targets agents` 指定曝光位置，`--skills domain/specdev` 表示仅提供开发领域总入口。它不会立即写规格或修改业务代码。

如果主要用于学习，改成：

```bash
speculo init . --workflows learning --skill-targets agents --skills domain/learning
```

同时安装多个领域，用逗号分隔，逗号前后不要加空格：

```bash
speculo init . --workflows specdev,learning,media --skill-targets agents --skills domain/specdev,domain/learning,domain/media
```

需要全部领域和全部公开入口时：

```bash
speculo init . --workflows all --skills all
```

若宿主读取 `.claude/skills/`，使用 `--skill-targets claude`；同时曝光到两个位置使用 `--skill-targets agents,claude`，二者共用同一份 `--skills` 清单。如何取舍见 [CLI 的安装与曝光](cli.md#安装与曝光)。宿主是否支持、何时重新加载技能，由宿主自己的当前行为决定。

## 3. 确认安装结果

```bash
speculo doctor .
```

检查输出中的失败项。`doctor` 只检查安装及其声明的范围，不会修复数据，也不代表你的业务测试已经通过。

常见布局如下，部分可选目录只有选择曝光或开始任务后才出现：

```text
你的项目/
├── AGENTS.md                  # 项目指令及 Speculo 发现入口
├── CLAUDE.md                  # 保留已有内容；新建时引导读取 AGENTS
├── .agents/
│   ├── speculo/               # 安装的方法正文和工具
│   │   ├── commands/
│   │   ├── workflows/
│   │   ├── references/
│   │   └── .speculo/          # 安装元数据、配置和业务数据
│   └── skills/                # 可选：Hub 完整包、曝光入口、项目自有 Skill
└── .claude/skills/            # 可选：另一宿主的入口
```

保留自己原有的 AGENTS、Skill 和配置。安装器只管理自己的区域和标记块，遇到同名第三方文件或人工修改会报告冲突，不能把警告理解为可以直接删除原件。

## 4. 把第一个请求发给 AI

在 AI 宿主中打开同一项目。先做一个不会改变业务代码的任务：

```text
请读取项目 AGENTS.md，并使用 Speculo 的 specdev/init-setup。
先只读了解项目的入口、包管理、构建和测试命令，告诉我已确认事实与未知项。
这次只做项目了解。
```

如果宿主没有自动发现入口，直接给安装后的路径：

```text
请读取 .agents/speculo/workflows/specdev/specdev-i-init-setup/SKILL.md，
按该入口只读了解当前项目，并告诉我下一步可以从哪些 Work 开始。
```

使用的是自然语言请求，不需要在终端执行 `speculo spec` 或 `speculo implement`；这些终端子命令不存在。Skill 在宿主里显示的名称可能是 `specdev-i-init-setup`，而选择安装曝光时使用的业务 ID 是 `specdev/init-setup`。

## 5. 做一次最小开发练习

下面是三次可以分开完成的请求；每次先看真实产物再继续。

**先写规格：**

```text
使用 specdev/spec，为当前待办应用增加“按完成状态筛选”。
筛选条件是全部、未完成、已完成；切换筛选不修改原任务数据。
请先检查现有代码，写清范围、边界和可观察验收条件。本次只形成规格。
```

AI 会返回负责本次工作的 change 和规格位置。保留实际路径，不假定它一定生成独立 Ticket。

**再明确实施：**

```text
我已认可刚才的规格。请使用 specdev/implement 实现该 change，
按当前宿主正常执行，在当前工作副本中完成适用测试和审查，返回验收证据。
本次允许修改项目文件并运行相关本地验证；Git 提交和远程交付另行处理。
```

完整获批 Spec 可以直接实现；需要独立调度或逐票跟踪时才拆 Ticket，需要总控时才增加 Goal。工作区和工具编排可分别选择，见 [SpecDev 指南](workflows/specdev.md#执行方式与工作区)。

**最后读懂结果：**

```text
使用 specdev/learn，围绕刚才的 change，
用零基础能懂的 Markdown 和 ASCII 图解释：用户切换筛选时，数据怎样流动？
请区分实际代码事实、类比和未验证内容。
```

## 6. 不写代码也能开始

- 项目与参考资料学习：`使用 specdev/learn，我想做离线同步，先讲清参考项目的功能、数据流和实现思路；本轮只学习。` 指定 change 就追加学习材料，未指定则新建学习 change，本轮图解交付并验证后完成。
- 学习：`使用 learning/question，mode=tutor，围绕 HTTP 缓存先给我 5 个问题，等我回答后再讲解。`
- 决策：`使用 person/steelman-deliberation，帮我权衡保留现有方案还是重做，先分析支持和反对理由。`
- 创作：`使用 media/brief，为非技术读者准备一份解释 HTTP 缓存的母稿，列出事实来源和适用边界。`
- 项目工具：`明确调用 command/status，汇总已安装领域、当前活动和下一步入口，只在会话中报告。`

这些领域各有自己的状态和前置条件，继续阅读对应[领域手册](workflows/README.md)。

## 7. 暂停、继续和升级

切换会话前请求 [handoff](commands/handoff.md)，新会话提供报告路径，并要求核对当前文件和检查点后继续。不要只依赖“继续上次”的聊天记忆。

更新 npm 包后，在使用项目中再次执行 `speculo init .` 刷新。省略参数时保留已有领域、Hub 包和曝光选择；显式清单或交互取消勾选会卸载未修改的受管包，运行时配置、change、知识和历史保留；这不会自动迁移旧协议业务数据。详细操作见 [CLI](cli.md)，安装中断见[恢复指南](transaction-recovery.md)。

需要设置项目默认 Agent 编排方式时，明确调用 [command/coordination-init](commands/coordination-init.md)。这属于所有 workflow 的公共能力，普通开发或学习初始化不会代为触发；具体模型、步骤和技能组合在每次任务中指定。
