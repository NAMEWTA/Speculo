# 背景
深度的将 `temp/skills/` 里的SKILLS按本项目的规范规定规则迁移改造到了本 speculo 项目
# 存在问题以及期待
1. 
```
speculo/workflows/dev/05-diagnose
speculo/workflows/dev/04-to-issues
```
为 横向独立执行的，故其文件夹和命令的命名本身都需要带相关的字母，例如
```
`05-diagnose.md` -> `H-diagnose.md`
`04-to-issues.md` -> `04-to-issues.md`
```
文件夹同理
2. workflows/dev 里涉及到需要使用到的原子 `speculo/skills` 请将这些完整的作为其对应 
```speculo/.speculo
speculo/commands
speculo/skills
speculo/workflows
``` 里具体命令的当前文件夹里的参考「禁止跨越太多文件夹进行引用」；原`speculo/skills` 里的的进行删除「但 commands 可调用 `speculo/skills`里的，故无需删除
1. 注意深度融合之后「除了原本的意思进行增强之后，对应生成的文档路径，需要严格按照当前项目的路径规范『禁止散布到项目任意位置』『只允许 `.speculo/` 中
2. 请将 `speculo/adapters` 删除
3. 在该项目里创建一个 `src` 目录，pnpm「11.1.3」 + node「22.22.3」开发一个CLI，只有两个命令「speculo init」和 「speculo update」「针对
speculo/commands
speculo/skills
speculo/workflows
进行更新」
1. 整理本项目所有内容，保持当前的一致性「因处于开发阶段，当前的文档和规范并不是ADR」

# 注意强调：
本项目的所有规范并没有最终确定，允许自行根据实际情况，调整文档内容与规范，例如：
```
speculo/.speculo/.config/ARCHITECTURE.md.example
speculo/.speculo/.config/CONVENTIONS.md.example
speculo/.speculo/.config/LESSONS.md.example
speculo/.speculo/.config/DATA-MODEL.md.example
speculo/.speculo/.config/RULES.md.example
speculo/.speculo/.config/STRUCTURE.md.example
```
如有当前改造使用不到的，或里面规范模版内容有问题的，可自行删除修正。