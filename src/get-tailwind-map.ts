import core from 'jscodeshift';

import { j } from './jscodeshift';
import { error } from './utils/logger';
import { isStyleModules } from './utils/validate';
import { getCompletionEntries } from './utils/file';

import { cssToTailwind } from './post-css';

import type { Apply } from './context';

interface TransformCreate {
  key: string;
  value: Promise<Apply>;
  importDecl: core.Collection<core.ImportDeclaration>;
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

      // import style from 'index.module.css';
      const importDefaultSpecifiers = importDecl
        .find(j.ImportDefaultSpecifier)
        .find(j.Identifier);
      // import * as style from 'index.module.css';
      const importNamespaceSpecifiers = importDecl
        .find(j.ImportNamespaceSpecifier)
        .find(j.Identifier);

      const importCSSNodes = [...importDefaultSpecifiers.nodes(), ...importNamespaceSpecifiers.nodes()];

      if (importCSSNodes.length === 0) return;

      const importCSSNode = importCSSNodes[0];
      const importCSSName = importCSSNode.name;

      const sourcePath = importDecl.find(j.Literal).get().node;
      const cssSourcePath = sourcePath.value;
      const cssPath = getCompletionEntries(dir)(cssSourcePath);

      promises.push({
        importDecl,
        key: importCSSName,
        value: cssToTailwind(cssPath),
      });
    });
    try {
      const classList = await Promise.all(promises.map(({ value }) => value));
      promises.forEach(({ key, importDecl }, i) => {
        const data = classList[i];
        map[key] = data;

        if (data.isUnlinked) {
          importDecl.remove();
        }
      });
    } catch (err) {
      error(String(err));
    }
  }

  return [ast.toSource({ quote: "double" }), map] as const;
};
