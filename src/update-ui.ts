import { homedir } from 'node:os';
import { join } from 'node:path';
import { offerUpdate, type UpdateChoice } from './update-flow.js';
import { inspectSelfInstall } from './self-update.js';
import { atomicWriteJson } from './update-state.js';
import { prompts } from './install-ui.js';
import { InstallCancelled } from './interaction.js';
import { color, logMessage, printError } from './terminal-ui.js';

export function startupUpdate(options: { packageRoot: string; local: string; argv: string[]; env: NodeJS.ProcessEnv }): Promise<number | undefined> {
  return offerUpdate({
    name: '@namewta/speculo', prefix: 'SPECULO', language: 'zh-CN', local: options.local, env: options.env,
    statePath: join(homedir(), '.speculo', 'update-state.json'), writeState: atomicWriteJson,
    inspect: () => inspectSelfInstall({ ...options, name: '@namewta/speculo', executable: 'speculo' }),
    ui: {
      async choose(message, choices) {
        const [heading, ...command] = message.split('\n');
        const answer = await prompts.select({ message: `${color.bold(color.yellow(heading!))}\n${color.cyan(command.join('\n'))}`,
          options: choices.map(choice => ({ ...choice, tone: choice.value === 'update' ? 'action' : undefined })), initialValue: 'update' });
        if (typeof answer === 'symbol') throw new InstallCancelled();
        return answer as UpdateChoice;
      },
      message(kind, message) {
        if (kind === 'error') printError(message);
        else logMessage(kind, message);
      },
    },
  });
}
