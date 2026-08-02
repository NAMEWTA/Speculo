# 项目目录示例

## 小型 Node 服务

```text
src/
├── app/
│   ├── create-server.ts
│   └── load-environment.ts
├── features/
│   └── user-auth/
│       ├── authenticate-user.ts
│       ├── authenticate-user.test.ts
│       └── user-token.ts
├── infrastructure/
│   ├── database/
│   └── http/
└── shared/
    └── result.ts
```

## React 应用

```text
src/
├── app/
│   ├── App.tsx
│   └── routes.tsx
├── features/
│   ├── workspace-search/
│   │   ├── WorkspaceSearchPanel.tsx
│   │   ├── workspace-search-query.ts
│   │   └── use-workspace-search.ts
│   └── user-settings/
├── shared/
│   ├── components/
│   └── hooks/
└── infrastructure/
    └── api/
```

`shared/components` 只放真正无业务归属且有多个真实调用方的组件。

## Electron

```text
src/
├── main/
│   ├── app-lifecycle.ts
│   └── windows/
├── preload/
│   └── workspace-api.ts
├── renderer/
│   ├── app/
│   └── features/
├── shared/
│   └── workspace-contract.ts
└── types/
    └── electron-api.d.ts
```

## Monorepo

```text
apps/
├── web/
└── api/
packages/
├── domain/
├── contracts/
├── ui/
└── test-support/
```

包边界应与独立发布、运行环境或稳定依赖方向对应，不要仅为缩短相对路径拆包。
