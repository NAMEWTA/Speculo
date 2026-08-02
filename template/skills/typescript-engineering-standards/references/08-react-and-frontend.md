# React 与前端规范

## 组件职责

组件输入由 Props 明确表达，渲染尽量纯粹。复杂功能按需拆分：

- 数据获取与缓存。
- 业务状态编排。
- 领域交互。
- 视觉展示。

组件名称使用具体领域语义：

- `WorkspaceReconnectDialog`
- `TerminalPermissionBanner`
- `PaymentMethodPanel`

避免 `DataComponent`、`CommonModal`、`GenericPanel`。

## Props

```ts
type WorkspaceCardProps = {
  workspace: WorkspaceSummary
  isSelected: boolean
  onSelect(workspaceId: string): void
}
```

要求：

- 使用 `XxxProps`。
- 布尔 Props 使用 `is`、`has`、`can`、`should`。
- 事件 Props 使用 `onXxx`。
- 避免大型万能对象和多个隐式控制模式的布尔值。
- 复杂互斥状态使用联合类型。
- 是否使用 `React.FC` 按仓库统一规则，不混用。

## Hook

- 自定义 Hook 以 `use` 开头。
- 一个 Hook 处理一个可命名职责。
- Effect 依赖完整，不通过关闭规则规避。
- Effect 创建资源时返回清理函数。
- 返回多个独立值时优先具名对象；稳定二元关系可用元组。
- 避免把普通纯函数包装成 Hook。

## 状态管理

- 状态尽量靠近使用位置。
- 只有多个远距离调用方共享时才提升。
- Store 按领域切片，不创建单一巨型 Store。
- Selector 尽量窄，避免组件订阅整个状态树。
- 派生数据优先计算，不重复存储。
- 服务端状态与本地 UI 状态分开管理。

## Effect

Effect 用于与外部系统同步，不用于替代普通计算。检查：

- 是否可在渲染时直接派生。
- 是否需要取消旧请求。
- 是否存在竞态和过期响应。
- 是否清理监听器、Timer 和订阅。
- 是否因对象引用变化导致无意义重复执行。

## 性能

- 不因为“可能更快”滥用 `memo`、`useMemo`、`useCallback`。
- 优化针对已识别瓶颈。
- 长列表使用虚拟化。
- 高频事件使用调度、批处理、节流或防抖。
- 避免在热渲染路径创建昂贵对象。
- 关键优化应有测试、测量或简短原因说明。

## 可访问性

- 优先语义化 HTML。
- 交互元素支持键盘。
- 图标按钮有可访问名称。
- 表单控件有 Label 和错误关联。
- 焦点管理可预测。
- 不用颜色作为唯一状态表达。
- 弹窗、菜单和提示遵守相应 ARIA 交互模式。

## 浏览器边界

- 验证 URL、消息、Storage 和第三方脚本输入。
- 避免不安全原始 HTML。
- 不把秘密放入前端 Bundle。
- 浏览器代码不导入 Node 专属模块，除非平台明确提供安全桥接。
