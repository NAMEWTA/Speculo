# 发布认证

先识别项目现有方案与 runner。适用的新配置优先考虑 npm trusted publishing（OIDC）；检查 npm/Node 版本、受支持的 CI provider/runner、repo、workflow filename、environment 与 npm 上的对应配置。GitHub Actions 需相应 id-token 权限。依据 https://docs.npmjs.com/trusted-publishers/ 在线核对当前支持条件。

已有 Token 方案检查最小包范围、发布权限、有效期、组织策略与 CI secret 映射；不把过期示例中的固定期限当作事实。不自动撤销或更换账户设置。需要更改时由拥有该动作的入口展示方案并取得授权。

凭据只通过用户受控的 secret 配置处理，不要求粘贴至对话、报告、命令参数或仓库文件，不把真实 Token 写入全局 .npmrc。npm publish --dry-run 不能证明真实发布认证成功；分别报告本地包检查和认证配置证据。

CI 只读依赖安装认证与发布写权限可能不同。不要因采用 OIDC 就删除仍用于安装私有包的既有凭据。
