# 注释模式示例

## 兼容性

```ts
// Why: Windows reports the executable path with inconsistent drive-letter casing.
const normalizedPath = normalizeWindowsDriveLetter(executablePath)
```

## 第三方缺陷

```ts
// Why: SDK 4.2 can invoke this callback twice after cancellation.
if (requestState.isSettled) {
  return
}
```

## 安全顺序

```ts
// Validate before resolving the path so traversal segments cannot escape the root.
const safeRelativePath = parseRelativePath(input)
```

## 性能

```ts
// Keep the compiled expression outside the hot loop; this runs for every log line.
const ansiPattern = createAnsiPattern()
```

## 不推荐

```ts
// Loop through items.
for (const item of items) {
  // Add the item.
  results.push(item)
}
```

## TODO

```ts
// TODO(PROJ-1423): Remove the v2 fallback after desktop 3.8 reaches 95% adoption.
```
