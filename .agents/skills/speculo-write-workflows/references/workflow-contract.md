# 领域包合同

## 布局

入口 SKILL.md 是标准领域 Skill；manifest.json v2 注册 SKILL.md、works、work_stages、业务 stages 和永久知识。Work 位于 domain-letter-name/SKILL.md。common/rules/activation-and-memory.md 定义按需读取和记忆网关；common/rules/domain-runtime.md 定义该域运行规则（按领域实际需要存在）。common/schemas、tools、私有 skills 与 _state 各有明确消费者。

## 发现与激活

领域 Skill 声明发现与激活、能力路由、永久知识。发现不创建状态、不授权。Work 可直接激活，直接读取共享 activation 协议，不先重入领域 Skill。知识树自身的 INDEX.md 保留，不与领域入口混淆。生成器从 manifest 与 Work YAML 生成领域 SKILL 的唯一 AUTO-INDEX 区块；不生成根 INDEX/README。

## 生命周期与所有权

逐字段定义必需/可选、类型、owner、初值、更新时机、枚举及与工件的关系。初始化、选择/恢复、开始、完成、阻塞、取消、归档各有前置条件与唯一 owner。OPS 等已有资源模型按原域合同处理，不套用 SpecDev。_state 只含种子，不包含实例、报告或 project-maintenance sidecar。

每个 Work 要有稳定业务 ID、输入来源、可选输入、产物、写集、状态变化、成功/失败/恢复路由。每项 required input 有生产者，每项产物有消费者。未知 namespace 不创建；永久知识按 gateway 写，CLI back 不接管。

## Common 与共享方法

同域共同规范归 common/rules；机器结构归 schemas；确定性动作归 tools；有独立调用过程且至少两个调用方时才建立私有 common/skills。单 Work 分支放该 Work。跨领域方法归 template/references，项目 Skill 由 roots.skills 定位。只依据当前输入读取需要的文件，不默认加载全域。

## 校验

按 [验证选择](../../_shared/validation-gates.md) 检查受影响的 manifest/目录/ID、YAML、指针、state、schema、owner 与行为。领域路由变化时用 generate-index 重建；canonical 依赖变化时重建其闭包，二次生成无 diff。各领域活动 writer 只接受当前协议；SpecDev 只发现当前 Markdown 对象；旧活动与混合协议明确拒绝，历史原件保留，不能让安装刷新隐式转换。

SpecDev runtime-contract 明确 state_seed optional，无独有数据不打包空 _state；其他领域保持 required。新对象按目录/README 验证，不能以缺 status 跳过非法材料。docs 为跨领域当前事实，不注册 SpecDev 独占 store；保护旧归档、config 独有字段、DESIGN 专用事务和 CLI staging/recover。
