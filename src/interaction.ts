/** Cancellation is handled by the CLI only after installation cleanup unwinds. */
export class InstallCancelled extends Error {
  constructor(public readonly exitCode: 0 | 130 = 130) {
    super("已取消，未应用安装变更。");
    this.name = "InstallCancelled";
  }
}
