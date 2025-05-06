import path from 'path';
import { fork, spawn } from 'child_process';

import { Command } from 'commander';

import { checkGitStatus } from './utils/master';

const jscodeshiftExecutable = require.resolve('.bin/jscodeshift');

const program = new Command();

program
  .name('css-modules-to-tailwind')
  .description('CLI to tailwind convert')
  .version('0.0.1');

program
  .argument('<dirs...>')
  .option('-n, --number <numbers...>', 'specify numbers')
  .option('-f, --force', 'skip check git status')
  .option('-p, --prefix <prefix>', 'specify tailwind prefix', 'tw:')
  .action((dirs, options) => {
    const args: string[] = [];

    checkGitStatus(options.force);

    const worker = fork(path.join(__dirname, './db-server/server.js'));

    args.push(path.join(__dirname, `./transform.js`));
    args.push(...dirs);
    args.push(`--prefix=${options.prefix}`);
    const command = `${jscodeshiftExecutable} -t ${args.join(' ')}`;
    const [cmd, ...restArgs] = command.split(' ');
    const cp = spawn(cmd, restArgs, { stdio: 'pipe' });

    process.on('beforeExit', () => {
      if (cp.killed) {
        return;
      }
      cp.kill(0);
    });

    cp.stdout?.on('data', (data) => {
      /** Complete stdout signal eg: Time elapsed: 7.306seconds */
      const output = data.toString('utf-8');
      console.log(output);
      if (/Time elapsed: [\d.]+/.test(output)) {
        worker.send?.('destroy');
      }
    });
  });

program.parse();
