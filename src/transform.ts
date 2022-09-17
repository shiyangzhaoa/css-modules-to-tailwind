import path from 'path';

import core from 'jscodeshift';

import { j } from './jscodeshift';

import { getTailwindMap } from './get-tailwind-map';
import { fillTailwindClass } from './fill-tailwind-class';

const transform = async (fileInfo: core.FileInfo) => {
  const ast = j(fileInfo.source);
  const dir = path.dirname(fileInfo.path);

  const result = await getTailwindMap(ast, dir);

  const tailwindMap = result[1];

  fillTailwindClass(ast, tailwindMap);

  return ast.toSource({ quote: 'single' });
};

export default transform;
