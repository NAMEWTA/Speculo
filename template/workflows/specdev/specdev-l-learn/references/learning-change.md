# 学习载体与完成

确定保存位置、恢复续学或交付时读取。学习对象可以是代码、需求参考、文章或 change；change 承载学习记录，不要求先有开发产物。

## 选择与恢复

- 用户指定未归档 change：核对身份和原 README，写入其 learning 目录。即使它已 completed/cancelled，也只追加学习材料和必要导航，不改变原 Outcome、范围、验收、owner 或开发进度。
- 同轮继续追问：从原 README 导航与学习索引恢复已选 change；不因每条消息未重复名称就另建，也不因学习完成而重新打开状态。
- 独立请求未指定 change：问题与必要资料明确后，按 `<Path>{roots.workflows}/specdev/common/rules/workflow-state-and-lifecycle.md</Path>` 新建 `YYYY-MM-DD-topic[-NN]`，检查活动与历史重名；不自动接入唯一活动 change。指定对象不存在、身份冲突、旧活动协议或未知 schema 时保留诊断，停止相关写入。
- 指定已归档对象：只读原件，在新的学习 change 中引用原 locator，不向封存对象追加文件；不支持的旧协议不进入当前 change 工具。

新建时采用 `<Path>{roots.workflows}/specdev/specdev-i-init-setup/assets/change-readme-template.md</Path>` 的轻量结构，原子创建 `<Path>{roots.state}/specdev/changes/{change}/README.md</Path>`，初始为 `Outcome: active`。scope 只记录学习对象、来源、本轮问题及获准的学习写集；acceptance 覆盖约定问题、来源与事实区分、图解和索引有效性；verification 在实际验证后填写。只创建真实需要的 README 和 learning 产物，无需 Spec、Ticket、Goal 或实现 Evidence。

已有 change 的写集限于 `<Path>{roots.state}/specdev/changes/{change}/learning/</Path>` 与 README 中必要的学习导航；新建学习 change 的 L 同时负责其轻量验收与结束。写前核对原 owner、相关 pending transaction、lock 和 recovery evidence。冲突只阻塞重叠写入，不把资料阅读当作接管开发 owner 的依据。

## 本轮交付与结束

1. 完成图解、索引和事实回读，执行 `node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage learn <Path>{roots.state}/specdev/changes/{change}</Path>`；缺资料影响约定问题、图解缺失或索引不一致时，不标记本轮交付完成。
2. 本 Work 为本轮新建的学习 change，或明确恢复的尚未完成学习专用 change：确认其 scope 仍仅为学习，没有新增开发任务，再读取 `<Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>` 和 `<Path>{roots.workflows}/specdev/specdev-i-init-setup/references/change-record-examples.md</Path>`。L 是本轮非实现验收 owner，记录真实会话依据、逐 AC 的 Method/Source/Observed/Result，以及校验命令和实际退出码；证据指向独立观察段或真实图解，不以 Outcome 自证。
3. 全部学习验收满足后，核对 README 原字节并由原 owner 原子更新唯一 `Outcome: completed`，再运行 `node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage complete <Path>{roots.state}/specdev/changes/{change}</Path>` 并回读。完成仅表示本轮材料交付；不等待掌握测验，不宣称用户已理解，不自动归档。失败保留证据与原恢复位置，由原 owner 修正不满足完成门的结论，不能报告成功。
4. 指定的开发 change 或已经 completed/cancelled 的对象，只验证新增学习产物与必要导航，不修改原范围、验收或 Outcome。学习产物不能代替开发验收；已经完成的学习 change 续问也沿用此追加分支。

需要保存接续时只使用原 README/索引，不新增学习 status 镜像。学习后产生的新开发请求由被激活的下一 Work 重新确认范围和载体；本 Work 不把学习目标自动改成实现目标。
