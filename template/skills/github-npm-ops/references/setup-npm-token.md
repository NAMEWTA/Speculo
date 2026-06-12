# 配置 npm Token 与 GitHub Secret

npm 现在强制要求发布时通过 2FA 或等效机制。Classic token 在多数账号设置下会返回 `E403`，必须改用 **Granular Access Token**。

## 生成 Granular Access Token

1. 登录 [npmjs.com](https://www.npmjs.com)，点头像 → **Access Tokens**
2. 点 **Generate New Token** → 选择 **Granular Access Token**
3. 关键字段：

   | 字段                    | 推荐值                                                                                     |
   | ----------------------- | ------------------------------------------------------------------------------------------ |
   | Token name              | `<package>-ci-release`（可识别用途）                                                       |
   | Expiration              | 90–365 天；设提醒到期前轮换                                                                 |
   | Packages and scopes     | 选 `Only select packages and scopes`，勾选目标包或整个 scope（如 `@scope`）                |
   | Permissions             | **Read and write**                                                                         |
   | Allowed organizations   | 如果在组织下发布，勾选对应组织                                                             |
   | Bypass two-factor auth  | 勾选（CI 无法交互完成 2FA）                                                                |
   | Allowed IP ranges       | 留空（GitHub Actions runner IP 不固定）                                                    |

4. 点 **Generate**，**立刻复制** token，关掉页面就再也看不到了

## 配置到 GitHub Secret

1. 仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点 **New repository secret**
3. `Name: NPM_TOKEN`，`Value: <粘贴 token>`
4. 点 **Add secret**

## 在 workflow 中引用

```yaml
- name: Publish to npm
  run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

重点：变量名必须是 `NODE_AUTH_TOKEN`（`actions/setup-node` 约定），不是 `NPM_TOKEN`。Secret 的名字可以是 `NPM_TOKEN`，但要映射过来。

## 验证 token 生效

本地不需要这个 token，它只在 CI 使用。如果想本地预演：

```bash
echo "//registry.npmjs.org/:_authToken=<token>" >> ~/.npmrc
npm whoami   # 应返回你的 npm 用户名
npm publish --dry-run --access public
```

预演完记得把 `.npmrc` 里的这行删掉。

## 轮换策略

- Token 到期前 7 天收到邮件提醒
- 轮换步骤：生成新 token → 更新 GitHub Secret → 在 npm 上 revoke 旧 token
- 如果怀疑泄露：立即在 npm Access Tokens 页面点 **Revoke**，workflow 会在下次运行时失败，再补生成新 token

## 常见误区

- **不要用 Classic Token 的 `Automation` 类型** — 某些账号策略下仍会触发 2FA 检查
- **不要把 token 写进 `.npmrc` 提交** — 只能走 `secrets`
- **不要与个人 publish token 混用** — CI 用专用 token，出问题可独立撤销
