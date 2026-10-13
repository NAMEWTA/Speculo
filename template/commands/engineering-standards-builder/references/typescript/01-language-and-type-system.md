# TypeScript / JavaScript：语言与类型系统

## 编译边界

- 每个运行环境使用与其全局对象、module resolution 和输出目标一致的配置；必要时以共享 base + 独立 app/test/tooling tsconfig 组织。
- 新项目默认采用当前版本可支持的严格检查；存量项目先测量，再按模块或错误基线 Ratchet。
- `skipLibCheck`、宽松选项和声明补丁记录原因、scope 与删除条件。
- 不为修复局部错误全局降低 strictness。

## 可信边界

- 外部 JSON、环境变量、消息、DOM dataset、存储和第三方 SDK 返回值先视为 `unknown`，在边界验证并缩窄。
- `any` 只允许在无法建模的兼容边界短暂存在；使用位置、风险和替换条件必须明确。
- 类型断言不能代替运行时验证；双重断言和非空断言只允许有可证明不变量的局部位置。
- 使用判别联合、精确字面量、泛型约束和领域类型表达非法状态。
- 不用宽泛索引签名抹去已知字段和错误拼写。

## 类型设计

- 类型从 public contract 和领域不变量出发，不为“减少几行”制造晦涩元编程。
- `interface` 与 `type` 遵循 scope 内主导实践；只有扩展/声明合并等语义差异需要决策，不把偏好升级为 MUST。
- 公共泛型有明确约束和推断体验；避免让调用者重复提供可推断类型。
- `readonly`、不可变集合或复制边界用于表达所有权，不无条件深只读全部对象。
- 枚举选择遵循现有序列化和编译目标；不要在不了解运行时产物时强制切换 `enum`、const object 或 union。

## JavaScript scope

纯 JavaScript 模块仍适用：

- 使用 JSDoc、`checkJs` 或 schema 获得边界类型；
- 不把迁移中的 `.js` 文件假装成已严格类型化；
- TypeScript 迁移按目录、入口或公共 API 分阶段；
- package exports 和运行时行为优先于类型表面统一。

## 规则输出示例

```text
Scope: module:packages/api-client
Level: MUST
Source: repository-fact + user-decision
Rule: 网络响应在 adapter 边界验证，业务层不得直接断言为领域类型。
Verification: typecheck；响应 schema 测试；review 搜索未经收窄的 unknown/any。
```

## 官方依据

- [TypeScript `strict`](https://www.typescriptlang.org/tsconfig/strict.html)
- [TypeScript narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript declaration reference](https://www.typescriptlang.org/docs/handbook/declaration-files/by-example.html)
