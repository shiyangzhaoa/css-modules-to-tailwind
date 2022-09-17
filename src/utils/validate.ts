import type { Rule, Node } from 'postcss';

export const isString = (val: unknown): val is string => typeof val === 'string';

export const isRule = (node: Node): node is Rule => node.type === 'rule';

export const isCssModules = (name: string) => /\.module\.css$/.test(name);

export const isScssModules = (name: string) => /\.module\.scss$/.test(name);

export const isLessModules = (name: string) => /\.module\.less$/.test(name);

export const isStyleModules = (name: string) =>
  isCssModules(name) || isScssModules(name) || isLessModules(name);
