import core from 'jscodeshift';

import { j } from './jscodeshift';
import { error } from './utils/logger';
import { isStyleModules } from './utils/validate';
import { getCompletionEntries } from './utils/file';

import { cssToTailwind } from './post-css';

import type { Apply } from './context';

interface TransformCreate {
  key: string;
  value: Promise<any>;
}

export const getTailwindMap = async (
  ast: core.Collection<unknown>,
  dir: string,
) => {
  const map: Record<string, Apply> = {};

  const cssImportSpecifiers = ast.find(
    j.ImportDeclaration,
    (node) =>
      j.StringLiteral.check(node.source) && isStyleModules(node.source.value),
  );

  if (cssImportSpecifiers.size() !== 0) {
    const promises: TransformCreate[] = [];
    cssImportSpecifiers.forEach((path) => {
      const importDecl = j(path);

      const importDefaultSpecifiers = importDecl
        .find(j.ImportDefaultSpecifier)
        .find(j.Identifier);
      const importDefaultNodes = importDefaultSpecifiers.nodes();

      if (importDefaultNodes.length === 0) return;

      const importDefaultNode = importDefaultNodes[0];
      const importDefaultName = importDefaultNode.name;

      const sourcePath = importDecl.find(j.Literal).get().node;
      const cssSourcePath = sourcePath.value;
      const cssPath = getCompletionEntries(dir)(cssSourcePath);

      promises.push({
        key: importDefaultName,
        value: cssToTailwind(cssPath),
      });
    });
    try {
      const classList = await Promise.all(promises.map(({ value }) => value));
      promises.forEach(({ key }, i) => {
        map[key] = classList[i];
      });
    } catch (err) {
      (err as Error[]).forEach((err) => {
        error((err as Error).message);
      });
    }
  }

  return [ast.toSource({ quote: 'single' }), map] as const;
};
