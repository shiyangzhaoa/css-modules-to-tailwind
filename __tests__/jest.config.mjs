/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

import * as path from 'node:path';

/** @type {import('jest').Config} */
export default {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov'],

  // A set of global variables that need to be available in all test environments
  globals: {
    'ts-jest': {
      // ts-jest configuration goes here
      tsconfig: '__tests__/tsconfig.json',
    },
  },

  maxWorkers: '50%',

  moduleDirectories: ['node_modules'],

  moduleFileExtensions: ['mts', 'cts', 'jsx', 'ts', 'tsx', 'js', 'cjs', 'mjs'],

  notify: true,
  preset: 'ts-jest',

  roots: [path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')],

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],

  testPathIgnorePatterns: ['/node_modules/'],

  // The regexp pattern or array of patterns that Jest uses to detect test files
  // testRegex: [],

  watchman: true,
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  testTimeout: 10000,
};
