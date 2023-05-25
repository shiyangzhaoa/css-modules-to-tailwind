import core from 'jscodeshift';

import { j } from './jscodeshift';

import type { Apply } from './context';

export const fillTailwindClass = (
  ast: core.Collection<unknown>,
  tailwindMap: Record<string, Apply>,
) => {
  const styleMemberExpressions = ast.find(
    j.MemberExpression,
    (node) =>
      j.Identifier.check(node.object) &&
      Object.keys(tailwindMap).includes(node.object.name),
  );

  if (styleMemberExpressions.size() !== 0) {
    styleMemberExpressions.forEach((styleMemberExpression) => {
      const { object, property } = styleMemberExpression.node;

      const isValidProp =
        j.Identifier.check(property) || j.Literal.check(property);

      if (j.Identifier.check(object) && isValidProp) {
        let validName = '';
        if (j.Literal.check(property)) {
          validName = String(property.value);
        } else {
          validName = property.name;
        }

        const cache = tailwindMap[object.name];

        const classList = cache.result[validName] ?? [];
        const removed = cache.removed ?? [];
        const isRemoved = removed.includes(validName);
        const isUnlinked = cache.isUnlinked || false;

        if (classList.length === 0 && !isUnlinked) {
          return;
        }

        const className = classList.join(' ');

        if (isRemoved) {
          const parent = styleMemberExpression.parent;

          // className={style.test}
          if (j.JSXExpressionContainer.check(parent.value)) {
            j(parent).replaceWith(j.literal(className));

            return;
          }

          // className={clsx(style.test, aa, bb, cc)}
          if (j.CallExpression.check(parent.value)) {
            styleMemberExpression.replace(j.literal(className));

            return;
          }

          // className={`${style.test} aa bb cc`}
          if (j.TemplateLiteral.check(parent.value)) {
            j(parent).replaceWith(j.literal(className));

            return;
          }

          // className={clsx([style.test, 'aa'])}
          if (j.ArrayExpression.check(parent.value)) {
            styleMemberExpression.replace(j.literal(className));

            return;
          }

          // className={clsx({ [style.test]: true })}
          if (j.ObjectProperty.check(parent.value)) {
            styleMemberExpression.replace(j.literal(className));

            return;
          }

          try {
            styleMemberExpression.replace(j.literal(className));

            return;
          } catch {
            //
          }
        }

        const quasis = [
          j.templateElement({ cooked: '', raw: '' }, false),
          j.templateElement(
            { cooked: ` ${className}`, raw: ` ${className}` },
            true,
          ),
        ];

        const expressions = (isUnlinked || isRemoved) ? [] : [
          j.memberExpression(
            j.identifier(object.name),
            j.identifier(validName),
          ),
        ];
        const tpl = j.templateLiteral(quasis, expressions);
        styleMemberExpression.replace(tpl);
      }
    });
  }

  return ast.toSource({ quote: 'single' });
};
