# 手册发现与重建

仅手册缺失、作用域变化或用户要求重建时读取。manifest 是线索，不是创建/删除手册的许可。

1. 枚举现有自有 AGENTS/CLAUDE、manifest 和项目入口，排除依赖、缓存、生成目录及第三方原件；已跟踪的特殊目录按其真实 owner 判断。典型 manifest 包括 package.json、pom.xml、build.gradle(.kts)、Cargo.toml、go.mod、pyproject.toml、setup.py/setup.cfg、CMakeLists.txt/Makefile、Gemfile、mix.exs、pubspec.yaml、composer.json、build.zig、*.csproj/*.fsproj、Package.swift、*.cabal/stack.yaml、flake.nix/default.nix。同目录多个 manifest 结合真实构建入口判断，保留辅助证据，不硬选与项目实际相反的主 manifest。
2. 从独有约束确定作用域：根项目、聚合模块、应用、能力/契约模块、scripts/docs 是定位角色，不是必填章节或强制铺设目录。无 manifest 的安全、部署、测试或生成边界也可有手册；无独有规则就复用父级。
3. 为候选作用域收集直接证据：入口与装配、公开接口、构建/测试脚本、配置、上游消费方、所有权及真实失败记录。能从仓库回答的问题不转交用户；不凭目录名编造职责。
4. 按实际手册作用域构建父子关系；父级指向最近子级，子级只维护自己的差异。使用 [最小骨架](../assets/agents-template.md)，由具体证据填写、裁剪和排序，不强制章节或引用数量。
5. 将失效且无独有约束的手册列删除候选，依 [手册合同](agents-contract.md) 处理工具导入。没有 manifest 不是删除依据；用户手册、第三方文件和缓存中的文件不因全局扫描自动清理。

完成标准：每个现有自有手册及新建候选都有处置，必要边界有入口，父子路由可达；所有生成陈述有证据，删除与迁移符合实际授权。
