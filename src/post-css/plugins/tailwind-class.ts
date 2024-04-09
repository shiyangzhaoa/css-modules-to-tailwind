/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';

import Tokenizer from 'css-selector-tokenizer';
import { AtRule } from 'postcss';

import { cssToTailwind } from '../index';
import { setContext } from '../../context';
import { getComposesValue, promiseStep } from '../../utils';

import type { Plugin, Declaration, Rule, Root, ChildNode } from 'postcss';
import { isRule } from '../../utils/validate';
import { getCompletionEntries } from '../../utils/file';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gen } = require('tailwind-generator');

export const tailwindPluginCreator = (
  cssPath: string
): Plugin => ({
  postcssPlugin: 'tailwind',
  async Once(root) {
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

      nodes?.forEach((node) => {
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

    const removedClassnames: string[] = [];

    (function picking() {
      const removed = treeShaking(root);

      if (removed.length !== 0) {
        removedClassnames.push(...removed.filter((item) => !polymorphisms.includes(item)));

        picking();
      }
    })()

    await setContext(cssPath, {
      result: result,
      removed: removedClassnames,
    });

    const promises: (() => Promise<any>)[] = [];
    root.walkDecls((decl) => {
      if (decl.prop === 'composes') {
        promises.push(() => convertComposes(decl, cssPath));
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

        return;
      }

      const allClassNode = nodes.filter((node) => node.type === 'class');

      if (allClassNode.length !== 0) {
        const validClass = allClassNode[allClassNode.length - 1] as any;
        selectors = [...selectors, validClass.name];
      }
    });

    const singleRule: Record<string, string> = {};
    decls.forEach(({ prop, value, important }) => {
      if (!important) {
        singleRule[prop] = value;
      }
    });
    const { success, failed } = gen(singleRule);

    const applyListStr = success.split(' ');
    const applyList = decls.filter(node => !failed.includes(node.prop) && !node.important);

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
      } else if (applyListStr.length !== 0) {
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

    rules.forEach((rule) => {
      dfs(rule, isUnnecessarySplit, isGlobalClass);
    });
  })(rule);

  return result;
};

const treeShaking = (root: Root) => {
  const multiple = getMultipleClass(root);

  return shaking(root.nodes, multiple);
};

const getMultipleClass = (root: Root) => {
  const map = new Map<string, boolean>();
  const result: string[] = [];

  root.walkRules((rule) => {
    const selectorNodes = Tokenizer.parse(rule.selector);
    selectorNodes.nodes.forEach((node) =>
      node.nodes.forEach((node) => {
        if (node.type === 'class') {
          if (map.has(node.name)) {
            result.push(node.name);
          }

          map.set(node.name, true);
        }
      }),
    );
  });

  return [...new Set(result)]
};

const shaking = (nodes: ChildNode[], multiple: string[], result: string[] = [], isGlobalParent = false): string[] => {
  let isGlobalClass = isGlobalParent;
  
  return [
    ...result,
    ...[...nodes].reduce((acc, node) => {
      if (isRule(node)) {
        let className = '';
        const validNodes = node.nodes.filter((node) => node.type !== 'comment');

        const selectorNodes = Tokenizer.parse(node.selector);

        selectorNodes.nodes.forEach((node) => {
          const { nodes } = node;
      
          if (isGlobalParent) return;
          if (
            nodes.find(
              (node) => node.type === 'pseudo-class' && node.name === 'global',
            )
          ) {
            isGlobalClass = true;
      
            return;
          }
      
          const allClassNode = nodes.filter((node) => node.type === 'class');
      
          if (allClassNode.length !== 0) {
            const validClass = allClassNode[allClassNode.length - 1] as any;
            className = validClass.name;
          }
        });
  
        if (validNodes.length === 0) {
          node.remove();

          if (!isGlobalClass && className && !multiple.includes(className)) {
            return [...acc, className];
          }

          return acc;
        }

        return shaking(validNodes, multiple, acc, isGlobalClass);
      } else {
        return acc;
      }
    }, [] as string[])
  ];
};

async function convertComposes(decl: Declaration, cssPath: string) {
  const { value } = decl;

  const result = getComposesValue(value);
  if (!result) {
    decl.value = decl.value;
    return;
  }

  if (result.length <= 2) return;

  const [, className, stylePath] = result;

  const cssDir = path.dirname(cssPath);
  const realPath = getCompletionEntries(cssDir)(stylePath);

  const tailWindMap = await cssToTailwind(realPath);

  if (tailWindMap && tailWindMap.result[className]) {
    const parent = decl.parent;
    if (parent && parent.type === 'rule') {
      const atRules = parent.nodes.find(
        (node) => node.type === 'atrule' && node.name === 'apply',
      ) as AtRule;
      const applyList = tailWindMap.result[className];

      if (atRules) {
        const validApply = [
          ...new Set([...atRules.params.split(/\s+/), ...applyList]),
        ];

        atRules.params = validApply.join(' ');
      } else if (applyList.length !== 0) {
        const applyDecl = new AtRule({
          name: 'apply',
          params: applyList.join(' '),
        });
        parent.prepend(applyDecl);
      }
    }
  }

  if (tailWindMap.isUnlinked || tailWindMap.removed.includes(className)) {
    decl.remove();
  }
}
