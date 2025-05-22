import path from 'path';


// eslint-disable-next-line @typescript-eslint/no-var-requires
const defineTest = require('jscodeshift/dist/testUtils').defineTest;

const tests = ['base'];

describe('prefix', () => {
  tests.forEach((test) =>
    defineTest(
      path.resolve(__dirname),
      './src/transform.ts',
      { prefix: 'tw:' },
      `prefix/${test}`,
    ),
  );
});
