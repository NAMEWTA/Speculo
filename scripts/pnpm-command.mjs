/** pnpm may expose a JavaScript entry point or a native executable in npm_execpath. */
export function pnpmCommand(args, manager = process.env.npm_execpath) {
  if (!manager?.toLowerCase().includes('pnpm')) throw Error('Run with pnpm');
  return /\.(?:c?js|mjs)$/i.test(manager)
    ? [process.execPath, [manager, ...args]]
    : [manager, args];
}
