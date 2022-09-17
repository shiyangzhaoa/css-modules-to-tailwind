import chalk from 'chalk';

export const info = (msg: string) => {
  console.log(chalk.yellow(`[Info]: ${msg}`));
};

export const warn = (msg: string) => {
  console.log(chalk.yellow(`[Warning]: ${msg}`));
};

export const error = (msg: string) => {
  console.log(chalk.red(`[Error]: ${msg}`));
};

export const success = (msg: string) => {
  console.log(chalk.green(`[Success]: ${msg}`));
};
