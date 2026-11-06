# 归档与删除仓库

先用完整 `OWNER/REPO` 核对身份、现状和用户范围。操作前查清独特代码、开放协作、发布/Pages、包或部署依赖；fork 或空仓也可能是正在使用的保留名称，不能仅凭类型删除。

## 归档

归档适合保留历史而停止日常维护。归档会限制仓库写入与协作，具体效果参见 [GitHub 归档文档](https://docs.github.com/en/repositories/archiving-a-github-repository/archiving-repositories)。撤销归档可重新开放维护，但不会自动解决废弃依赖。

```bash
gh repo archive OWNER/REPO --yes
gh api repos/OWNER/REPO --jq '{full_name,archived}'
```

需要取消归档时：

```bash
gh api -X PATCH repos/OWNER/REPO -F archived=false --jq '{full_name,archived}'
```

`--yes` 仅跳过工具交互，不代表获得用户授权；已有明确的具名归档请求可以直接完成。

## 删除

删除应对应用户明确要移除的仓库及已解释的影响。依赖与需要保存的资料先处理完毕，再执行：

```bash
gh repo delete OWNER/REPO --yes
```

随后用同一账号读回，并结合删除请求的成功响应确认结果。独立的 404 也可能表示对象不可见，不能单凭它判定删除完成。请求超时先确认实际状态，再决定是否重试。

[删除文档](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository) 说明 fork、权限和数据的影响；[恢复文档](https://docs.github.com/en/repositories/creating-and-managing-repositories/restoring-a-deleted-repository) 有适用条件和时限。不能把恢复机制当作可靠备份，也不能承诺删除一定可逆。

## 选择依据

归档、保留和删除是不同的产品决定。用户只要求盘点或建议时，呈现具名对象、事实和建议；用户已经选定范围时继续执行，不再逐仓重复询问。遇到新发现的独特数据或范围冲突，暂停该项并说明具体问题，其他独立工作可以继续。
