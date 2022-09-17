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

        const tailwindClassArr = tailwindMap[object.name][validName];

        if (tailwindClassArr && tailwindClassArr.length !== 0) {
          const tailwindClassName = tailwindClassArr.join(' ');

          const quasis = [
            j.templateElement({ cooked: '', raw: '' }, false),
            j.templateElement(
              { cooked: ` ${tailwindClassName}`, raw: ` ${tailwindClassName}` },
              true,
            ),
          ];
          const expressions = [
            j.memberExpression(
              j.identifier(object.name),
              j.identifier(validName),
            ),
          ];
          const tpl = j.templateLiteral(quasis, expressions);
          styleMemberExpression.replace(tpl);
        }
      }
    });
  }

  return ast.toSource({ quote: 'single' });
};
