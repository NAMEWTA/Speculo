---
id: specdev/eli5
type: workflow-entry
workflow: specdev
name: 五岁解释
description: 像对五岁的我一样解释一个主题。当用户要求用极其简单的图片解释某件事如何运作时，生成大图、少字的持久化 HTML 图解。
---

# eli5：像对五岁的我一样解释

## 原作者核心（完整中文转写）

像对五岁的我一样解释一个主题。要求用极其简单的图片解释某件事如何运作时，使用此 Work。

像对一个完全不了解这个主题的五岁孩子一样解释，使用一个大图、少字的 HTML 工件。

主题：`$ARGUMENTS`

这里的“五岁”是字面标准，不只是“初学者”的别称：假定读者真的只有五岁，没有专业词汇、背景知识或抽象模型。保留事实准确性，但用熟悉的物体、动作、因果和类比来解释。

## 执行

1. 读取 `<Path>{roots.workflows}/specdev/INDEX.md</Path>`、全局状态和当前 change 状态。选择用户指定或唯一活跃的 change；没有时按 SpecDev 启动协议创建。`current_work` 为空时设为 `specdev/eli5`；若指向其他 Work，先完成显式交接。
2. 将调用中的 `$ARGUMENTS` 解析为主题；直接提出的图解请求以用户最新消息为主题。主题缺失时只询问主题，不猜测。
3. 按需读取当前 change 工件、项目事实和可靠来源。先找出一个孩子必须理解的核心因果，再选择一个熟悉、不会歪曲事实的视觉类比。
4. 原子写入 `<Path>{roots.state}/specdev/changes/{change}/eli5.html</Path>`。页面必须是可直接打开的完整 HTML，以大图为主、文字为辅；避免术语、长段落和先备知识。需要术语时，先用孩子能懂的话解释。
5. 检查 HTML 可打开、主题明确、主要解释由图片承担、文字足够少，而且一个真正的五岁孩子仅看页面就能说出“它是什么”和“它怎么运作”。可用浏览器时实际打开检查；不可用时做静态检查并说明限制。
6. 运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage eli5`。成功后把 `specdev/eli5` 去重加入 `works_run`，清空 `current_work`，并返回 HTML 完整路径；失败时保留 `current_work` 和阻塞原因，便于恢复。

## 完成标准

- `<Path>{roots.state}/specdev/changes/{change}/eli5.html</Path>` 存在且是完整 HTML。
- 页面确实面向五岁、零背景读者，并以大图、少字解释主题，而不是把普通长文换成更大的字号。
- 解释简单但不虚假；类比的边界不会让读者形成相反理解。
- 状态已原子更新；除当前 change 工件外，没有修改项目代码、永久知识或远程系统。
