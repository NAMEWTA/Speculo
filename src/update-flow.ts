import { satisfies, validRange } from 'semver';
import type { Release } from './update-check.js';
import { fetchRelease, isNewerRelease } from './update-check.js';
import { ProcessCancelledError } from './update-process.js';

export type UpdateChoice = 'update' | 'skip';
export interface UpdateUI {
  choose(message: string, choices: Array<{ value: UpdateChoice; label: string; hint: string }>): Promise<UpdateChoice>;
  message(kind: 'info' | 'success' | 'warn' | 'error', text: string): void;
}
export interface OwnedInstall {
  nodeVersion: string;
  command(version: string): string;
  install(version: string): Promise<number>;
  verify(version: string): Promise<boolean>;
  resume(env: NodeJS.ProcessEnv): Promise<number>;
}
export interface UpdateOptions {
  name: string;
  local: string;
  env: NodeJS.ProcessEnv;
  prefix: 'FASTCLI' | 'SPECULO';
  language: 'en' | 'zh-CN';
  ui: UpdateUI;
  inspect(): Promise<OwnedInstall | undefined>;
  fetch?: (name: string) => Promise<Release | null>;
}

/** Consume the marker even on excluded commands; it must never reach a launched tool. */
export function consumeResumeMarker(env: NodeJS.ProcessEnv, prefix: string, local: string): boolean {
  const key = `${prefix}_UPDATE_RESUME`;
  const resumed = env[key] === local;
  delete env[key];
  return resumed;
}

export function shouldCheckUpdate(env: NodeJS.ProcessEnv, prefix: string, interactive: boolean): boolean {
  const ci = env.CI?.toLowerCase();
  return interactive && env[`${prefix}_NO_UPDATE_CHECK`] !== '1' && (!ci || ci === '0' || ci === 'false');
}

/** undefined means continue the original command; a number is the final exit code. */
export async function offerUpdate(options: UpdateOptions): Promise<number | undefined> {
  const { ui, local, name, env, prefix } = options;
  const zh = options.language === 'zh-CN';
  const say = (en: string, cn: string) => zh ? cn : en;
  const release = await (options.fetch ?? fetchRelease)(name).catch(() => null);
  if (!release || !isNewerRelease(local, release.version)) return;
  const heading = [
    `${say('Update available', '发现新版本')} · ${name}`,
    say(`Current version: v${local}`, `当前版本号：v${local}`),
    say(`Latest version: v${release.version}`, `最新版本号：v${release.version}`),
  ].join('\n');
  const choice = await ui.choose(heading, [
    { value: 'update', label: say('Update now', '立即更新'), hint: say('Update and continue with the new version', '更新后用新版继续本次命令') },
    { value: 'skip', label: say('Update later', '下次更新'), hint: say('Continue now; remind me next time', '继续本次操作，下次启动再次提醒') },
  ]);
  if (choice === 'skip') return;
  const install = await options.inspect();
  if (!install) {
    ui.message('error', say('The current installation could not be verified for automatic updates. Update using your original installation method, then run the command again.', '无法核验当前安装的自动更新方式。请按原安装方式更新后，重新运行本次命令。'));
    return 1;
  }
  const command = install.command(release.version);
  if (release.node && (!validRange(release.node) || !satisfies(process.versions.node, release.node) || !satisfies(install.nodeVersion, release.node))) {
    ui.message('error', say(`The update requires Node.js ${release.node}. Update Node.js before retrying.`, `新版要求 Node.js ${release.node}，请更新 Node.js 后重试。`));
    return 1;
  }
  ui.message('info', `${say('Updating. Installer output follows.', '正在更新，以下为安装器执行输出。')}\n${command}`);
  try {
    const code = await install.install(release.version);
    if (code !== 0) {
      ui.message('error', `${say('Update did not complete; the original command was not run. Retry:', '升级未完成，尚未执行原命令。重试：')}\n${command}`);
      return code;
    }
    if (!await install.verify(release.version)) throw new Error(say('The updated installation could not be verified.', '升级后的安装未通过验证。'));
    ui.message('success', say(`Updated to ${release.version}. Continuing…`, `已升级至 ${release.version}，继续本次命令…`));
    try { return await install.resume({ ...env, [`${prefix}_UPDATE_RESUME`]: release.version }); }
    catch (error) {
      if (error instanceof ProcessCancelledError) throw error;
      ui.message('error', `${String(error)}\n${say('Could not continue with the updated CLI. Run the original command again.', '新版续跑失败，请重新运行原命令。')}`);
      return 1;
    }
  } catch (error) {
    if (error instanceof ProcessCancelledError) throw error;
    ui.message('error', `${String(error)}\n${say('The original command was not run. Repair with:', '尚未执行原命令。修复命令：')}\n${command}`);
    return 1;
  }
}
