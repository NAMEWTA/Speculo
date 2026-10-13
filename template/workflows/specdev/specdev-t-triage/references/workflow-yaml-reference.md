# 发布流水线参考

这是按项目改写的示例，不是必须安装的 release.yml。实际名称、触发器、Node/包管理器版本、包集合、registry、渠道和质量闸来自发布预检。示例动作版本在使用时核对官方文档，沿用项目的版本固定策略。

## 阶段

1. checkout 固定 tag/commit，核对 tag 对应的 release SHA 与包版本。
2. 安装项目声明的运行时与包管理器，用冻结 lockfile 安装依赖。
3. 执行项目 test/typecheck/lint/build 及 CLI bin/pack 检查。
4. 提取已确认的本版本 release notes；必需正文缺失即失败。
5. 对每个 required 包按明确 registry/access/dist-tag 发布；OIDC/Token 由认证合同选定。
6. 创建或补全 GitHub Release，prerelease/latest 设置与原发布计划一致。
7. 返回 run ID、SHA 与发布回执，由 T 重读验证。

## GitHub Actions 片段

```yaml
permissions:
  contents: write
  id-token: write # 采用 OIDC/provenance 且确有需要时
# checkout/setup-node/包管理器的 uses 与版本按项目政策固定
# 以下变量由已确认的发布计划提供
steps:
  - run: pnpm install --frozen-lockfile
  - run: pnpm check
  - run: npm pack --dry-run
  - run: npm publish --registry "$REGISTRY" --tag "$DIST_TAG" --access "$PACKAGE_ACCESS"
  - run: gh release create "$TAG" --verify-tag --title "$RELEASE_TITLE" --notes-file release-notes.md
```

此片段省略了项目特定的 job、认证与变量注入，不能原样当成可执行完整 workflow。发布顺序不是回滚保证；npm 成功后后续失败按恢复协议补缺项。多包、可复用 workflow、自建 runner 和人工发布需在预检明确其真实行为。

最低权限按实际动作配置，纯 npm 不因示例而增加 packages:write。id-token:write 本身不证明 npm 已配置 trust。远程 workflow 更新仍经正常 I/C 流程，不能由 release-preflight 自动落文件。

## 检查发布包

核对 name/version、repository、license、private/publishConfig、files/exports/main/types、bin/shebang/执行权限、engines/packageManager 和依赖分类。以 npm pack --dry-run 的实际清单检查缺失入口、秘密文件、测试/缓存误入；CLI 路径从本项目 manifest 获取，不硬编码示例路径。新包的 404 还需区分权限/registry，不直接保证名字可用。
