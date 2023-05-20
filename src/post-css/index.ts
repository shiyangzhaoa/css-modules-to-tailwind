import fs from 'fs';
import fsPromises from 'fs/promises';

import postcss from 'postcss';
import scss from 'postcss-scss';
import less from 'postcss-less';

import { getContext, setContext } from '../context';
import { error, warn } from '../utils/logger';
import { isLessModules } from '../utils/validate';

import { tailwindPluginCreator } from './plugins/tailwind-class';

import type { AcceptedPlugin } from 'postcss';

export const cssToTailwind = async (cssPath: string) => {
  const plugins: AcceptedPlugin[] = [
    tailwindPluginCreator(cssPath),
    // postcss-nested, if you want split nested
  ];

  const processor = postcss(plugins);

  const cache = await getContext(cssPath);
  if (cache) {
    return cache;
  }

  const contents = fs.readFileSync(cssPath).toString();

  const { css: result } = await processor.process(contents, {
    syntax: isLessModules(cssPath) ? less : scss,
    from: 'tailwind.css',
  });

  let isUnlinked = false;

  if (!result) {
    isUnlinked = true;

    fsPromises.access(cssPath).then(() => {
      warn(`${cssPath} has been deleted`);
      fsPromises.unlink(cssPath).catch((err) => {
        error(err);
      });
    });
  } else {
    fsPromises.writeFile(cssPath, result).catch((err) => {
      error(err);
    });
  }

  const context = await getContext(cssPath);

  const newContext = { ...context, isUnlinked };

  await setContext(cssPath, newContext);

  return newContext;
};
