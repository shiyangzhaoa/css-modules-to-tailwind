import fs from 'fs';
import path from 'path';

import JSON5 from 'json5';
import findUp from 'find-up';

import { warn } from './logger';
import { isString } from './validate';

export const readJson = (filePath: string) => {
  try {
    fs.accessSync(filePath);
  } catch {
    return;
  }

  try {
    const configBuffer = fs.readFileSync(filePath, 'utf-8');
    return JSON5.parse(configBuffer.toString());
  } catch (err) {
    warn((err as Error).message);
  }
};

export function hasZeroOrOneAsteriskCharacter(str: string): boolean {
  let seenAsterisk = false;
  for (let i = 0; i < str.length; i++) {
      if (str.charCodeAt(i) === 0x2A) {
          if (!seenAsterisk) {
              seenAsterisk = true;
          }
          else {
              // have already seen asterisk
              return false;
          }
      }
  }
  return true;
}

export interface Pattern {
  prefix: string;
  suffix: string;
}

const comparePaths = (type: 'lessThan' | 'greaterThan') => (a: string, b: string) => {
  const patternA = tryParsePattern(a);
  const patternB = tryParsePattern(b);
  const lengthA = typeof patternA === "object" ? patternA.prefix.length : a.length;
  const lengthB = typeof patternB === "object" ? patternB.prefix.length : b.length;
  if (type === 'greaterThan') {
    if (lengthB === undefined) {
      return true;
    }
    return lengthB < lengthA;
  }

  if (type === 'lessThan') {
    if (lengthA === undefined) {
      return true;
    }
    return lengthB > lengthA;
  }
};

function tryParsePattern(pattern: string): string | Pattern | undefined {
  const indexOfStar = pattern.indexOf("*");
  if (indexOfStar === -1) {
      return pattern;
  }
  return pattern.indexOf("*", indexOfStar + 1) !== -1
      ? undefined
      : {
          prefix: pattern.substring(0, indexOfStar),
          suffix: pattern.substring(indexOfStar + 1)
      };
}

function isPatternMatch({ prefix, suffix }: Pattern, candidate: string) {
  return candidate.length >= prefix.length + suffix.length &&
      candidate.startsWith(prefix) &&
      candidate.endsWith(suffix);
}

const tryRemovePrefix = (str: string, prefix: string) => {
  return str.startsWith(prefix) ? str.substring(prefix.length) : undefined;
};

const tsconfigPath = findUp.sync('tsconfig.json');
const options = tsconfigPath && JSON5.parse(fs.readFileSync(tsconfigPath, 'utf-8')).compilerOptions;
export const completeEntriesFromPath = (fragment: string) => {
  try {
    if (options?.paths) {
      let pathResults: string | undefined;
      let matchedPath: string | undefined;
      Object.entries(options.paths as Record<string, string[]>).forEach(([key, patterns]) => {
        if (key === ".") return;
        const keyWithoutLeadingDotSlash = key.replace(/^\.\//, "");
        if (patterns) {
          const pathPattern = tryParsePattern(keyWithoutLeadingDotSlash);
          if (!pathPattern) return;
          const isMatch = typeof pathPattern === "object" && isPatternMatch(pathPattern, fragment);
          const isLongestMatch = isMatch && (matchedPath === undefined || comparePaths('greaterThan')(key, matchedPath));
          if (isLongestMatch) {
            matchedPath = key;
            const parsed = tryParsePattern(patterns[0]);
            if (parsed === undefined || isString(parsed)) {
                return;
            }
              const pathPrefix = keyWithoutLeadingDotSlash.slice(0, keyWithoutLeadingDotSlash.length - 1);
              const remainingFragment = tryRemovePrefix(fragment, pathPrefix);
              pathResults = `${parsed.prefix}${remainingFragment}`;
          }
          if (typeof pathPattern === "string" && key === fragment) {
            pathResults = patterns[0];
          }
        }
      })

      
      return pathResults;
    }
  } catch(error) {
    console.error(error);
  }
};

export const getCompletionEntries = (pathDir: string) => (fragment: string) => {
  const completionEntries = completeEntriesFromPath(fragment);

  if (tsconfigPath && completionEntries) {
    return path.resolve(path.dirname(tsconfigPath), completionEntries);
  }

  return path.resolve(pathDir, completionEntries || fragment);
};