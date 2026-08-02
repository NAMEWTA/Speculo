# TypeScript 类型系统规范

## 严格模式

新项目必须启用 `strict`。成熟项目根据现状制定分阶段迁移，但新代码不得继续增加宽松类型债务。

建议评估：

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `useUnknownInCatchVariables`
- `verbatimModuleSyntax`
- `isolatedModules`
- `forceConsistentCasingInFileNames`

必须与当前编译器、模块系统和构建工具兼容。

## 外部输入使用 `unknown`

HTTP、RPC、WebSocket、IPC、CLI 参数、环境变量、JSON、数据库反序列化、本地存储、第三方 SDK 和插件输入默认不可信。

类型断言不能替代运行时验证。优先使用项目已存在的 Schema 库或明确类型守卫，不擅自引入新依赖。

## 禁止传播 `any`

`any` 仅允许存在于极小兼容层，并满足：

- 最小作用域。
- 有原因和退出条件。
- 经过运行时验证后再向内部传递。
- 不进入公共 API。

## 可辨识联合

互斥状态使用单一判别字段，避免多个可能矛盾的布尔值。状态分支执行穷尽检查。

## `type` 与 `interface`

由问答确定项目默认偏好。无项目事实时推荐：默认使用 `type`；需要声明合并、公开扩展或明确 `implements` 契约时使用 `interface`。

## 类型标注

必须显式标注：

- 导出函数返回类型。
- 跨模块公共 API。
- 插件、回调和扩展点。
- 递归函数。
- 权限、金额、状态转换等高风险函数。

局部明显变量可依赖推断。

## 断言、空值和声明文件

优先顺序：控制流收窄、类型守卫、运行时验证、`satisfies`、最后才使用 `as`。

禁止无理由双重断言和 `@ts-ignore`。必须压制时使用带原因的 `@ts-expect-error`。

明确区分可选属性、`null`、`undefined` 和失败结果。

`.d.ts` 只用于环境、模块、声明扩展和发布声明；普通业务类型放在 `.ts`。
