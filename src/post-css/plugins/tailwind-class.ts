import path from 'path';

import { AtRule } from 'postcss';
import Tokenizer from 'css-selector-tokenizer';

import { cssToTailwind } from '../index';
import { setContext } from '../../context';
import { getComposesValue, promiseStep } from '../../utils';
import {
  processValue,
  processProps,
  getTailwindBy,
} from '../converters';

import type { Plugin, Declaration, Rule, Root } from 'postcss';

export const tailwindPluginCreator: (cacheKey: string) => Plugin = (
  cacheKey,
) => ({
  postcssPlugin: 'tailwind',
  async Root(root) {
    const dependencies: string[] = [];
    const polymorphisms: string[] = [];
    const map = new Map();
    root.walkDecls((decl) => {
      const isDependentBySelf =
        decl.prop === 'composes' && !getComposesValue(decl.value);

      if (isDependentBySelf) {
        dependencies.push(...decl.value.split(/\s+/));
      }
    });
    root.walkRules((rule) => {
      const selectorNodes = Tokenizer.parse(rule.selector);
      selectorNodes.nodes.forEach((node) =>
        node.nodes.forEach((node, i, arr) => {
          const isLast = i === arr.length - 1;
          if (node.type === 'class' && isLast) {
            if (map.has(node.name)) {
              polymorphisms.push(node.name);
            }
            map.set(node.name, true);
          }
        }),
      );
    });

    const result = {};
    const rules: Rule[] = [];
    const atRules: Rule[] = [];
    void (function reduceRules(node: Root | Rule | AtRule, isAtRule = false) {
      const nodes = node.nodes;

      nodes.forEach((node) => {
        switch (node.type) {
          case 'atrule':
            reduceRules(node, true);
            break;
          case 'rule':
            if (isAtRule) {
              atRules.push(node);
            } else {
              rules.push(node);
            }
            break;
          default:
            break;
        }
      });
    })(root);
    rules.forEach((node) => {
      const ruleTransformResult = transformRule(
        node,
        dependencies,
        polymorphisms,
      );
      Object.assign(result, ruleTransformResult);
    });

    atRules.forEach((node) => {
      const ruleTransformResult = transformRule(
        node,
        dependencies,
        polymorphisms,
        true,
      );
      Object.assign(result, ruleTransformResult);
    });

    await setContext(cacheKey, result);

    const promises: (() => Promise<any>)[] = [];
    root.walkDecls((decl) => {
      if (decl.prop === 'composes') {
        promises.push(() => convertComposes(decl));
      }
    });

    await promiseStep(promises);

    return;
  },
});

const transformRule = (
  rule: Rule,
  dependencies: string[],
  polymorphisms: string[],
  isUnnecessarySplit = false,
) => {
  const result = {};
  void (function dfs(
    rule: Rule,
    isParentUnnecessarySplit = isUnnecessarySplit,
    isGlobalParent = false,
  ) {
    let isGlobalClass = isGlobalParent;
    checkRuleValid(rule);

    const rules = rule.nodes.filter((node) => node.type === 'rule') as Rule[];
    let selectors: string[] = [];

    const decls = rule.nodes.filter(
      (node) => node.type === 'decl',
    ) as Declaration[];

    const selectorNodes = Tokenizer.parse(rule.selector);

    selectorNodes.nodes.forEach((node) => {
      const { nodes } = node;

      if (isGlobalParent) return;
      if (
        nodes.find(
          (node) => node.type === 'pseudo-class' && node.name === 'global',
        )
      ) {
        isGlobalClass = true;

        const index = nodes.findIndex(
          (node) => node.type === 'pseudo-class' && node.name === 'global',
        );
        nodes.forEach((node, i) => {
          if (node.type === 'class' && i < index) {
            const validName = node.name;
            node.name = validName;
          }
        });

        return;
      }

      nodes.forEach((node) => {
        if (node.type === 'class') {
          const validName = node.name;
          node.name = validName;
        }
      });

      const allClassNode = nodes.filter((node) => node.type === 'class');

      if (allClassNode.length !== 0) {
        const validClass = allClassNode[allClassNode.length - 1] as any;
        selectors = [...selectors, validClass.name];
      }
    });

    rule.selector = Tokenizer.stringify(selectorNodes);

    const singleRule: Record<string, string> = {};
    decls.forEach(({ prop, value, important }) => {
      const invalidValue = String(processValue(prop, value));
      const invalidProp = processProps(prop, value);
      if (!important) {
        singleRule[invalidProp] = invalidValue;
      }
    });
    const { tailwind: applyListStr, useful } = getTailwindBy(singleRule);
    const applyList = decls.filter(node => !useful[node.prop]);

    let isUnnecessarySplit = isParentUnnecessarySplit;
    if (isUnnecessarySplit === false) {
      isUnnecessarySplit = !selectorNodes.nodes.every((node) =>
        node.nodes.every((node) =>
          ['class', 'invalid', 'spacing'].includes(node.type),
        ),
      );
    }
    if (isUnnecessarySplit === false) {
      isUnnecessarySplit = selectorNodes.nodes.some(({ nodes }) =>
        nodes.some((node, i, arr) => {
          const isValidClass = node.type === 'class' && i === arr.length - 1;
          if (!isValidClass) return false;

          return (
            dependencies.includes(node.name) ||
            polymorphisms.includes(node.name)
          );
        }),
      );
    }
    if (isUnnecessarySplit === false) {
      isUnnecessarySplit = isGlobalClass;
    }

    if (applyList.length === 0) {
      rules.forEach((rule) => {
        dfs(rule, isUnnecessarySplit, isGlobalClass);
      });

      return;
    }

    if (isUnnecessarySplit) {
      const atRules = rule.nodes.find(
        (node) => node.type === 'atrule' && node.name === 'apply',
      ) as AtRule;
      if (atRules) {
        const validApply = [
          ...new Set([...atRules.params.split(/\s+/), ...applyListStr]),
        ];
        atRules.params = validApply.join(' ');
      } else {
        const applyDecl = new AtRule({
          name: 'apply',
          params: applyListStr.join(' '),
        });
        rule.prepend(applyDecl);
      }

      selectors = selectors.filter((selector) => selector === rule.selector);
    }

    selectors.forEach((name) => {
      Object.assign(result, {
        [name]: applyListStr,
      });
    });

    applyList.forEach((node) => {
      node.remove();
    });

    checkRuleValid(rule);

    rules.forEach((rule) => {
      dfs(rule, isUnnecessarySplit, isGlobalClass);
    });
  })(rule);

  return result;
};

const checkRuleValid = (rule: Rule) => {
  if (!rule) return;

  const validNodes = rule.nodes.filter((node) => node.type !== 'comment');

  if (validNodes.length === 0) {
    const parent = rule.parent;
    rule.remove();

    parent && parent.type === 'rule' && checkRuleValid(parent as Rule);
  }
};

async function convertComposes(decl: Declaration) {
  const { value } = decl;

  const result = getComposesValue(value);
  if (!result) {
    decl.value = decl.value;
    return;
  }

  if (result.length <= 2) return;

  const [, className, stylePath] = result;

  const styleAbsolutePath = path.resolve(stylePath);

  const tailWindMap = await cssToTailwind(styleAbsolutePath);

  if (tailWindMap && tailWindMap[className]) {
    const parent = decl.parent;
    if (parent && parent.type === 'rule') {
      const atRules = parent.nodes.find(
        (node) => node.type === 'atrule' && node.name === 'apply',
      ) as AtRule;
      const applyList = tailWindMap[className];

      if (atRules) {
        const validApply = [
          ...new Set([...atRules.params.split(/\s+/), ...applyList]),
        ];

        atRules.params = validApply.join(' ');
      } else {
        const applyDecl = new AtRule({
          name: 'apply',
          params: applyList.join(' '),
        });
        parent.prepend(applyDecl);
      }
    }
  }
}
