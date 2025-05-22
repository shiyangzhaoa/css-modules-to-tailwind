import path from 'path';

import core, { type API } from 'jscodeshift';

import { j } from './jscodeshift';

import { getTailwindMap } from './get-tailwind-map';
import { fillTailwindClass } from './fill-tailwind-class';

const transform = async (fileInfo: core.FileInfo, _: API, options: { prefix?: string }) => {
  const ast = j(fileInfo.source);
  const dir = path.dirname(fileInfo.path);

  const result = await getTailwindMap(ast, dir);

  const tailwindMap = result[1];

  fillTailwindClass(ast, tailwindMap, options.prefix);

  return ast.toSource({ quote: 'double' });
};

export default transform;
