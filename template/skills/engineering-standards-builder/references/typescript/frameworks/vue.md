# Vue 规范适配器

仅对 Project Inventory 明确识别为 Vue 的 scope 生成。Vue 2、Vue 3、Options API、Composition API、Nuxt 和纯 Vite Vue 的可用 API 不同，必须先识别版本和项目主导实践。

Vue 官方 Style Guide 当前标注为需要更新，示例主要基于 Options API，未完整覆盖现代 Composition API 与 `<script setup>`。因此规则来源优先级为：当前 Vue Guide、TypeScript Guide、Composables/Testing/Security/Performance Guide、`eslint-plugin-vue` 官方配置，再把 Style Guide Priority A/B 作为版本适用的默认建议，而不是唯一权威。

## 版本与模式

记录：

- Vue 2 或 Vue 3 及精确大/小版本范围；
- `vue-template-compiler`、`@vue/compiler-sfc`、compat build；
- Options API、Composition API 或混合迁移；
- `<script setup>`、普通 `setup()`、JSX/TSX；
- Vite、Vue CLI、Nuxt 等构建模型；
- Pinia、Vuex 或其他状态方案；
- SSR/SSG、hydration 和客户端专属边界。

默认策略：Vue 3 新模块或仓库已占主导时 SHOULD 使用 Composition API 与 `<script setup lang="ts">`；Vue 2 或稳定 Options API 存量模块保持局部一致，通过 Ratchet 迁移，绝不生成不可用 API。

## SFC 与组件边界

- 一个 SFC 表达一个主要组件；小型局部辅助渲染逻辑可按项目实践保留。
- 文件、组件 `name`、模板标签和自动导入约定保持可追踪；无冲突的新项目默认多词业务组件名，根组件和框架特殊文件可例外。
- props、emits、slots 和 model 是公开合同；父传子、子发事件，组件不得修改 prop 或其不拥有的对象。
- UI、领域规则、请求编排和平台副作用在复杂度出现时分离；不按机械行数拆成无意义 composable。

## TypeScript 组件合同

Vue 3 `<script setup>` 按项目版本使用类型化宏：

- `defineProps`：运行时声明和纯类型声明二选一，不混用；外部输入仍需要运行时验证时显式提供 validator/schema。
- props 默认值使用当前版本支持的 reactive destructure 或 `withDefaults`；生成规则必须匹配项目 Vue/compiler 版本。
- `defineEmits`：事件名和 payload 精确类型化；不以无约束字符串事件替代合同。
- `defineSlots`、template refs、`provide/inject` 与 `InjectionKey` 在项目版本支持时建立类型安全。
- `defineModel` 仅在项目 Vue 版本和约定支持时使用；否则使用明确 `modelValue` / `update:modelValue` 合同。
- 不用 `as any` 或非空断言隐藏 mount 前 template ref 为空、可选注入或异步数据状态。

Options API 模块使用 `defineComponent`、`PropType` 和项目当前推断方式；不为了使用新语法重写稳定组件。

## 响应式状态

- `ref` 用于独立值和需要可替换引用的状态；`reactive` 用于稳定对象图；遵循当前 Vue 版本的解构语义。
- 派生数据使用纯 `computed`，不复制到可变 ref，也不在 computed getter 中写状态或执行 I/O。
- 模板和脚本中的 ref 解包差异必须被理解；不得依赖偶然自动解包。
- 外部不可深代理对象、超大不可变结构或第三方实例按需要使用 `shallowRef`、`markRaw` 等，并记录边界理由。
- state 的所有者明确；局部状态不因“可能复用”提前提升到全局 store。

## watch、watchEffect 与生命周期

- `watch` 用于明确源、需要前后值或精确触发控制的副作用；`watchEffect` 用于依赖可由同步执行自然收集的副作用。
- 可由 `computed` 或事件直接完成的逻辑不使用 watcher。
- watcher、timer、DOM listener、subscription、observer 和请求必须清理；使用当前版本支持的 cleanup API，并覆盖过期异步结果。
- 明确 flush timing；依赖更新后 DOM 的逻辑使用适合的 post-flush 或 `nextTick`，不靠任意 timeout。
- 只能在组件实例存在时运行的副作用放在正确生命周期；SSR 中不在服务端执行浏览器专属 API。

## Composable

- 复用有状态逻辑的函数使用 `useXxx`；工厂/纯函数不滥用 `use` 前缀。
- 需要生命周期注入的 composable 在 `setup()` / `<script setup>` 同步调用，并文档化调用上下文。
- 输入可变化时接受 ref/getter/MaybeRefOrGetter，并在 reactive effect 中规范化；不要在调用时一次性读取后失去响应性。
- 默认返回包含 refs 的普通对象，以便解构后保持响应性；返回 reactive object 时明确解构限制。
- composable 拥有的资源在 scope dispose/unmount 时释放；全局单例资源需有独立生命周期与测试重置机制。
- composable 不隐藏跨模块写入、路由跳转或 toast 等副作用，除非名称和合同明确。

## 组件通信与状态管理

- props down / events up；跨层共享服务使用明确 provide/inject contract，避免字符串 key 冲突。
- slots/scoped slots 的 slot props 是公开合同；默认内容和必需 slot 行为可测试。
- Pinia/Vuex 只在项目已采用或用户确认时生成专属规则。Pinia store：state 可序列化边界明确，getter 保持派生，action 表达业务操作，SSR 时隔离请求状态。
- 不把所有请求缓存、表单草稿和瞬时 UI 状态集中进全局 store。

## Template、可访问性与安全

- `v-for` 使用稳定业务 key，不用会变化的 index 代表可重排实体。
- 避免在同一元素组合 `v-if` 与 `v-for`；先过滤/计算集合或提升条件。
- `v-if` 用于真实挂载切换，`v-show` 用于高频可见性切换；按成本选择。
- 事件 modifier、attribute fallthrough 和多根组件行为按组件 contract 使用，不依赖隐式透传。
- 优先语义 HTML、label、键盘交互、焦点管理和可访问名称。
- `v-html` 只接受经过可信边界消毒或完全受信任的内容；用户模板、URL、style 和脚本均视为安全边界。

## SSR、hydration 与性能

- 服务端 render 必须确定；随机数、时间、浏览器状态和全局单例按请求隔离或在 hydration 后处理。
- DOM、window、storage、observer 和 browser-only 库放在客户端生命周期/guard 中。
- 先稳定 props、缩小响应式依赖和组件边界；测量后再采用 shallow API、`v-memo`、虚拟列表或手工缓存。
- 大组件/路由按现有 bundler 使用异步组件和 code splitting；不因拆包破坏错误与加载状态。

## 测试

- 使用项目既有 Vue Test Utils、Vitest/Jest、Testing Library、Playwright/Cypress 等工具。
- 组件测试断言公开 DOM、emits、slot、可访问交互和用户行为；不依赖 `wrapper.vm` 私有实现作为主要合同。
- snapshot 只能补充稳定结构，不替代行为断言。
- composable 的纯逻辑可直接测试；依赖生命周期/provide/inject 的 composable 通过最小宿主组件测试并验证 cleanup。
- 与 CSS layout、原生浏览器事件、focus、teleport、hydration 或平台 API 强相关的行为使用 browser component/E2E。
- store 测试隔离 active Pinia/全局状态，覆盖 action 失败、并发和 SSR 污染风险。

## 工具链

- ESLint 使用项目版本匹配的 `eslint-plugin-vue` flat/legacy config，至少覆盖对应 Vue 版本的 essential correctness rules；recommended/style 层按项目选择。
- TypeScript SFC 使用项目当前认可的 parser、language tools 和 `vue-tsc`/framework typecheck；编辑器通过不等于 CI typecheck。
- formatter 与 template/style block 一致；避免 ESLint 与 formatter 争夺机械格式。
- 自动导入、宏和类型生成文件必须由 CI 验证 freshness，并从手写规则中排除。

## 访谈触发

仅在证据冲突时询问：

- Vue 2/compat → Vue 3 的目标与期限；
- Options API、Composition API、`<script setup>` 的新增代码策略；
- Pinia/Vuex 迁移与局部/全局状态边界；
- `defineModel`、reactive props destructure 等版本相关能力；
- unit/component/browser/E2E 的责任边界；
- Nuxt server/client 与 SSR 状态隔离。

## 输出验收

Vue scope 的生成规范必须同时覆盖：组件合同、响应式、composable、watch/cleanup、模板安全与可访问性、SSR（如适用）、测试和实际工具链。不得只生成文件命名和 `<script setup>` 偏好。

## 官方依据

- [Vue TypeScript with Composition API](https://vuejs.org/guide/typescript/composition-api.html)
- [Vue Composables](https://vuejs.org/guide/reusability/composables.html)
- [Vue Watchers](https://vuejs.org/guide/essentials/watchers.html)
- [Vue Testing](https://vuejs.org/guide/scaling-up/testing.html)
- [Vue Security](https://vuejs.org/guide/best-practices/security.html)
- [Vue Performance](https://vuejs.org/guide/best-practices/performance.html)
- [Vue Accessibility](https://vuejs.org/guide/best-practices/accessibility.html)
- [Vue Style Guide status](https://vuejs.org/style-guide/)
- [eslint-plugin-vue user guide](https://eslint.vuejs.org/user-guide/)
- [Pinia core concepts](https://pinia.vuejs.org/core-concepts/)
