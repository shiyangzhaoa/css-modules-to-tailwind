import fs from 'fs';
import path from 'path';

import { info } from './logger';

import { readJson } from './file';
import type { Apply } from '../context';

interface Queen {
  resolve: (val: any) => void;
  promise: () => Promise<any>;
}

type DBData = Record<string, Apply>

function noop() {
  //
}

export class DB {
  #path = '';
  #queen: Queen[] = [];

  constructor(name: string) {
    this.#path = path.resolve(__dirname, `./${name}.json`);

    this.destroy();
    this.init();
  }

  get database() {
    return readJson(this.#path) as DBData;
  }

  async #run() {
    const first = this.#queen[0];

    if (!first) return;

    const { resolve, promise } = first;
    const data = await promise();
    this.#queen.shift();
    resolve(data);
    this.#run();
  }

  #checkQueen(task: Queen) {
    if (this.#queen.length !== 0) {
      this.#queen = [...this.#queen, task];
    } else {
      this.#queen = [task];
      this.#run();
    }
  }

  init() {
    try {
      fs.accessSync(this.#path);
    } catch {
      info('DB init');
      fs.writeFileSync(this.#path, '{}');
    }
  }

  async read(key: string) {
    // The json file is being updated, please waiting
    const task: Queen = {
      resolve: noop,
      promise: () => Promise.resolve(),
    };

    const promiseCreator = () => {
      const json = this.database?.[key];
      return Promise.resolve(json);
    };

    task.promise = promiseCreator;

    const promise = new Promise<Apply>((resolve) => {
      task.resolve = resolve;
    });

    this.#checkQueen(task);

    const data = await promise;

    return data;
  }

  async write(cacheKey: string, data: Apply) {
    const task: Queen = {
      resolve: noop,
      promise: () => Promise.resolve(),
    };
    const promiseCreator = () => {
      const json = this.database;

      if (!json[cacheKey]) {
        json[cacheKey] = {
          result: {},
          removed: data.removed,
        };
      }

      Object.entries(data.result).forEach(([key, value]) => {
        Object.assign(json[cacheKey].result, { [key]: [...new Set(value)] });
      });

      fs.writeFileSync(this.#path, JSON.stringify(json));
      return Promise.resolve();
    };

    task.promise = promiseCreator;

    const promise = new Promise((resolve) => {
      task.resolve = resolve;
    });

    this.#checkQueen(task);

    await promise;
  }

  destroy() {
    try {
      fs.accessSync(this.#path);
      fs.unlinkSync(this.#path);
    } catch (err) {
      //
    }
  }
}
