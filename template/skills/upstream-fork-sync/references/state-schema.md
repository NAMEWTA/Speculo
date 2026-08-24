# State Schema

## Root state

`<Path>{roots.state}/skills/upstream-fork-sync/state.json</Path>` 使用 schema v1：

```json
{
  "schema_version": 1,
  "updated_at": "RFC-3339 timestamp",
  "current_change": "YYYY-MM-DD-ascii-kebab-topic",
  "repositories": {
    "app": {
      "integrated_upstream_sha": "full SHA",
      "main_merge_sha": "full SHA or null",
      "observed_upstream_sha": "full SHA"
    }
  }
}
```

根 state 只是当前同步索引。它不保存 ref 配置、run history、dirty paths、文件清单、conflicts、fetch details 或 verification logs。

## Change state

每个 `<Path>{roots.state}/skills/upstream-fork-sync/{change}/state.json</Path>` 包含：

```json
{
  "schema_version": 1,
  "created_at": "RFC-3339 timestamp",
  "repository_map_sha256": "sha256",
  "repositories": {
    "app": {
      "product_sha": "full SHA",
      "upstream_sha": "full SHA",
      "integrated_upstream_sha": "full SHA",
      "main_merge_sha": null,
      "recorded_at": null,
      "verification": []
    }
  }
}
```

只列出存在 upstream delta 的仓库。`record-integration` 填写 `main_merge_sha`、`recorded_at` 和 verification，并推进根 checkpoint；assessment、fetch、mirror observation 和报告生成都不能推进 `integrated_upstream_sha`。

## Update rules

- 发布 change 的全部文件后才替换根 state。
- 未知 schema、额外字段、非法 repository id 和 SHA 类型全部拒绝。
- 保存 checkpoint 必须仍在 product 与 upstream 历史中。
- `record-integration` 要求精确匹配 change 的冻结 upstream target。
- 旧 change 的冻结 target 不得回退或分叉当前根 checkpoint。
- 状态写入使用同目录临时文件、fsync 和 rename；失败不得伪装为成功。
