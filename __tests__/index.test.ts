import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

describe('CLI Tailwind Prefix Support', () => {
  const cliPath = path.resolve(__dirname, '../build/index.js');
  const testFilePath = path.resolve(__dirname, './test-file.tsx');
  const testCssPath = path.resolve(__dirname, './test-file.module.css');

  beforeEach(() => {
    // Reset test files before each test
    execSync(`git checkout -- ${testFilePath} ${testCssPath}`);
  });

  test('should handle default prefix "tw:"', () => {
    execSync(`node ${cliPath} ${testFilePath}`);
    const transformedFile = readFileSync(testFilePath, 'utf-8');
    expect(transformedFile).toContain('className="tw:bg-red-500"');
  });

  test('should handle custom prefix "tw-"', () => {
    execSync(`node ${cliPath} ${testFilePath} --prefix=tw-`);
    const transformedFile = readFileSync(testFilePath, 'utf-8');
    expect(transformedFile).toContain('className="tw-bg-red-500"');
  });

  test('should handle custom prefix "custom:"', () => {
    execSync(`node ${cliPath} ${testFilePath} --prefix=custom:`);
    const transformedFile = readFileSync(testFilePath, 'utf-8');
    expect(transformedFile).toContain('className="custom:bg-red-500"');
  });
});
