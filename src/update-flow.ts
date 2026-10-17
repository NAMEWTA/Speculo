import { readFile } from 'node:fs/promises';
import { gt, satisfies, valid, validRange } from 'semver';
import type { Release } from './update-check.js';
import { fetchRelease, isNewerRelease } from './update-check.js';

export type UpdateChoice = 'update' | 'skip' | 'ignore';
export interface UpdateUI {
  choose(message: string, choices: Array<{ value: UpdateChoice; label: string; hint: string }>): Promise<UpdateChoice>;
  message(kind: 'info' | 'success' | 'warn' | 'error', text: string): void;
}
export interface OwnedInstall {
  nodeVersion: string;
  install(version: string): Promise<number>;
  verify(version: string): Promise<boolean>;
  resume(env: NodeJS.ProcessEnv): Promise<number>;
}
export interface UpdateOptions {
  name: string;
  local: string;
  statePath: string;
  env: NodeJS.ProcessEnv;
  prefix: 'FASTCLI' | 'SPECULO';
  language: 'en' | 'zh-CN';
  ui: UpdateUI;
  inspect(): Promise<OwnedInstall | undefined>;
  writeState(path: string, value: unknown): Promise<void>;
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
  const { ui, local, name, statePath, env, prefix } = options;
  const zh = options.language === 'zh-CN';
  const say = (en: string, cn: string) => zh ? cn : en;
  const release = await (options.fetch ?? fetchRelease)(name).catch(() => null);
  if (!release || !isNewerRelease(local, release.version)) return;
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    if (state.version === 1 && typeof state.ignoredVersion === 'string' && valid(state.ignoredVersion)
      && !gt(release.version, state.ignoredVersion)) return;
  } catch { /* An absent or damaged optional preference cannot block the command. */ }

  const command = `npm install -g ${name}@${release.version}`;
  const heading = `${name}  ${local} → ${release.version}`;
  const install = await options.inspect();
  if (!install) {
    ui.message('info', `${heading}\n${say('Update using your original installation method. Automatic updates require a verified npm global installation.', '请按原安装方式升级；自动升级仅支持已核验的当前 npm 全局安装。')}`);
    return;
  }
  const choice = await ui.choose(`${say('Update available', '发现新版本')} · ${heading}\n${command}`, [
    { value: 'update', label: say('Update now', '立即升级'), hint: say('Continue this command with the new version', '升级后用新版继续本次命令') },
    { value: 'skip', label: say('Skip this time', '本次跳过'), hint: say('Ask again next time', '下次启动再次提醒') },
    { value: 'ignore', label: say('Skip until the next version', '跳过直到下个版本'), hint: say(`Ignore ${release.version}`, `忽略 ${release.version}`) },
  ]);
  if (choice === 'skip') return;
  if (choice === 'ignore') {
    try { await options.writeState(statePath, { version: 1, ignoredVersion: release.version }); }
    catch { ui.message('warn', say('Could not save the preference; skipped this time only.', '无法保存偏好，仅本次跳过。')); }
    return;
  }
  if (release.node && (!validRange(release.node) || !satisfies(process.versions.node, release.node) || !satisfies(install.nodeVersion, release.node))) {
    ui.message('error', say(`The update requires Node.js ${release.node}. Update Node.js before retrying.`, `新版要求 Node.js ${release.node}，请更新 Node.js 后重试。`));
    return 1;
  }
  ui.message('info', say('Updating. npm output follows.', '正在升级，以下为 npm 执行输出。'));
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
      ui.message('error', `${String(error)}\n${say('Could not continue with the updated CLI. Run the original command again.', '新版续跑失败，请重新运行原命令。')}`);
      return 1;
    }
  } catch (error) {
    ui.message('error', `${String(error)}\n${say('The original command was not run. Repair with:', '尚未执行原命令。修复命令：')}\n${command}`);
    return 1;
  }
}
