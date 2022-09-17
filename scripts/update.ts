import fs from 'fs/promises';
import path from 'path';

import puppeteer from 'puppeteer';
import postcss from 'postcss';
import chalk from 'chalk';

import type { Declaration, ChildNode, AtRule } from 'postcss';

const validList = [
  'Layout',
  'Flexbox & Grid',
  'Spacing',
  'Sizing',
  'Typography',
  'Backgrounds',
  'Borders',
  'Effects',
  'Filters',
  'Tables',
  'Transitions & Animation',
  'Transforms',
  'Interactivity',
  'SVG',
  'Accessibility'
];

const uselessUrls = [
  'https://tailwindcss.com/docs/space',
  'https://tailwindcss.com/docs/container',
  'https://tailwindcss.com/docs/divide-width',
  'https://tailwindcss.com/docs/divide-color',
  'https://tailwindcss.com/docs/divide-style',
];

const BASE_URL = 'https://tailwindcss.com';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/docs/installation`, {
    waitUntil: 'domcontentloaded',
    timeout: 0
  });

  console.log(chalk.green(`${BASE_URL}/docs/installation opened`));

  const navItem = await page.$$('li.mt-12');
  const urlPromises: Promise<string[] | undefined>[] = [];
  navItem.forEach(ele => {
    urlPromises.push((async () => {
      const subTitleEle = await ele.$('h5');
      if (!subTitleEle) {
        return;
      }

      const textContent = await subTitleEle.getProperty('textContent');
      const value = await textContent.jsonValue() as string;
      if (!validList.includes(value)) {
        return;
      }

      const aEle = await ele.$$('a');
      const promises: Promise<string>[] = [];
      aEle.forEach(ele => {
        promises.push((async () => {
          const href = await ele.getProperty('href');
          return href.jsonValue();
        })())
      });
      return Promise.all(promises);
    })())
  });

  const urls = await Promise.all(urlPromises);
  const validUrls = (urls.filter(Boolean).flat() as string[]).filter(url => !uselessUrls.includes(url));

  const tasks: Promise<any>[] = [];
  const combinations: Record<string, any> = {};

  validUrls.forEach(url => {
    tasks.push((async () => {
      const page = await browser.newPage();
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 0
      });

      console.log(chalk.green(`${url} opened`));

      const heads = await page.$$('thead > tr > th');
      let classIndex = 0;
      let propsIndex = 0;

      await Promise.all(heads.map((ele, index) => {
        return (async () => {
          const text = await (await ele.getProperty('textContent')).jsonValue();

          if (text === 'Class') {
            classIndex = index;
          }
          if (text === 'Properties') {
            propsIndex= index;
          }
        })();
      }));

      const propsTableELe = await page.$('table');

      if (!propsTableELe) {
        return;
      }

      const rows = await propsTableELe.$$('tbody > tr');
      return Promise.all(rows.map(row => {
        return (async () => {
          const items = await row.$$('td');
          const keyEle = items[classIndex];
          const valueEle = items[propsIndex];
          if (!keyEle || !valueEle) {
            return;
          }

          const keyProp = await keyEle.getProperty('textContent');
          const valueProp = await valueEle.getProperty('textContent');
          const key = await keyProp.jsonValue();
          const value = await valueProp.jsonValue();

          if (!key || !value) {
            return;
          }

          try {
            const ast = await (await postcss().process(value, { from: 'tailwind.css' })).root;
            const decls = (ast.nodes as ChildNode[]).filter(
              (node) => node.type === 'decl',
            ) as Declaration[];
            // TODO: useful?
            const atrules = (ast.nodes as ChildNode[]).filter(
              (node) => node.type === 'atrule',
            ) as AtRule[];

            const rule: Record<string, string> = {};
            decls.forEach(decl => {
              const { prop, value } = decl;
              const isUglyDoc = ['0px', '0rem', '0em'].includes(value);
              rule[prop] = isUglyDoc ? '0' : value;
            });
            const keys = Object.keys(rule).sort();

            let acc = combinations;
            keys.forEach((k, i, arr) => {
              const validKey = JSON.stringify({ [k]: rule[k] });
              if (acc[validKey]) {
                if (i === arr.length - 1) {
                  acc[validKey].value = key;
                }
              } else {
                acc[validKey] = i === arr.length - 1 ? {
                  value: key
                } : {};
              }
              acc = acc[validKey];
            });
          } catch(err) {
            console.log(chalk.red(`${url}: ${err}`));
          }
        })();
      }));
    })());
  })

  await Promise.all(tasks);

  fs.writeFile(path.join(__dirname, '../src/combination.json'), JSON.stringify(combinations))

  console.log(chalk.green('completed~'));

  await browser.close();
})()