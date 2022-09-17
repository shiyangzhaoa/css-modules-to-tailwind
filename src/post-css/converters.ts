import Color from 'color';

import { combination } from './constant';

export const processProps = (property: string, value: string) => {
  if (property === 'background' && value.startsWith('#')) {
    return 'background-color';
  }

  return property;
};

export const processValue = (property: string, value: string) => {
  if (['0em', '0ex', '0ch', '0rem', '0vw', '0vh', '0%', '0px'].includes(value)) {
    return 0;
  }

  if (/color$/.test(property) || property === 'background') {
    return convertColor(value);
  }
  switch (property) {
    case 'font-weight':
      return convertFontWeight(value);
    case 'line-height':
      return convertLineHeight(value);
    case 'font-size':
      return convertFontSize(value);
    case 'height':
    case 'width':
      return convertDimensions(value);
    case 'padding':
    case 'margin':
    case 'padding-top':
    case 'padding-left':
    case 'padding-right':
    case 'padding-bottom':
    case 'margin-top':
    case 'margin-left':
    case 'margin-right':
    case 'margin-bottom':
      return convertSpacing(property, value);
    case 'border-radius':
      return convertBorderRadius(value);
    default:
      return value;
  }
};

export const convertFontWeight = (fontWeight: string) => {
  switch (fontWeight) {
    case 'normal':
      return 400;
    case 'bold':
      return 700;
    default:
      return fontWeight;
  }
};

export const convertColor = (color: string) => {
  if (color.startsWith('#')) {
    try {
      return Color(color).rgb().string().replaceAll(',', '');
    } catch {
      return color;
    }
  }

  return color;
};

const roundToRem = (remArray: number[], num: number, val: number) => {
  const find = remArray.find((val) => val === num);

  if (find === 0) {
    return 0;
  }

  return find ? `${find}rem` : val;
};

const convertPxToRem = (
  remArray: number[],
  value: string,
  conversionFactor = 16,
) => {
  const numericVal = parseInt(value.split('px')[0]);
  const min = Math.min(...remArray);
  const max = Math.max(...remArray);
  if (
    numericVal &&
    numericVal <= conversionFactor * max &&
    numericVal >= conversionFactor * min
  ) {
    const rem = numericVal / conversionFactor;
    const closest = roundToRem(remArray, rem, numericVal);
    if (closest === 0) {
      return 0;
    } else {
      return closest;
    }
  }
  return value;
};

export const convertUnit = (
  remArray: number[],
  value: string | number,
  conversionFactor = 16,
  stripLeadingZeros = false,
) => {
  let converted: string | number = value;
  if (String(value).endsWith('px')) {
    converted = convertPxToRem(remArray, value as string, conversionFactor);
  }
  if (stripLeadingZeros) {
    converted = String(converted).replace(/^[0.]+/, '.');
  }
  return converted;
};

const borderRadiusArray = [0, 0.125, 0.25, 0.375, 0.5];
export const convertBorderRadius = (borderRadius: string) => {
  return convertUnit(borderRadiusArray, borderRadius);
};

const lineHeightArray = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];

export const convertLineHeight = (lineHeight: string) => {
  return convertUnit(lineHeightArray, lineHeight);
};

const fontSizeArray = [
  0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 2.5, 3, 4,
];

export const convertFontSize = (fontSize: string) => {
  return convertUnit(fontSizeArray, fontSize);
};

const dimensionArray = [
  0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16,
];

export const convertDimensions = (dimension: string | number) => {
  if (dimension === 0 || dimension === '1px') {
    return dimension;
  }
  return convertUnit(dimensionArray, dimension);
};

const paddingArray = [
  0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16,
];
const marginArray = [
  -0.25, -0.5, -0.75, -1, -1.25, -1.5, -2, -2.5, -3, -4, -5, -6, -8, -10, -12,
  -14, -16, 0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14,
  16,
];

export const convertSpacing = (prop: string, value: string) => {
  if ((prop === 'padding' || prop === 'margin') && value === '1px') {
    return value;
  }
  if (
    ['-1px', 'auto'].includes(value) &&
    [
      'margin',
      'margin-left',
      'margin-right',
      'margin-top',
      'margin-bottom',
    ].includes(prop)
  ) {
    return value;
  }
  const dimensions = value.split(/\s+/);
  const remArray = prop.startsWith('padding') ? paddingArray : marginArray;
  if (dimensions.length === 1) {
    return convertUnit(remArray, dimensions[0]);
  }

  return value;
};

/**
 * try getTailwindBy({ 'overflow': 'hidden','max-width': '100%', 'height': '1px', 'text-overflow':'ellipsis', 'white-space': 'nowrap' ,'border-width': '0', display: 'flex', 'clip': 'rect(0, 0, 0, 0)',  margin: '-1px', padding: '0', position: 'absolute', 'white-space': 'nowrap', width: '1px', 'margin-left': '1.25rem', 'margin-right': '1.25rem' })
 * get ['sr-only', 'flex', 'mx-5', 'max-w-full', 'truncate']
 * @param rule
 */
export const getTailwindBy = (rule: Record<string, string>) => {
  const props = Object.keys(rule).sort();
  const tailwind: string[] = [];
  const uselessProps: string[] = [];
  void function dfs(keys, acc = combination, uselessKeys: string[] = []) {
    keys.forEach((key, index) => {
      const curKeys = keys.filter((_, j) => j > index);
      const validKey = JSON.stringify({ [key]: rule[key] });
      const cur = acc[validKey];
      if (cur?.value) {
        const count = Object.keys(cur).length;
        if ((curKeys.length === 0 || count === 1)) {
          if (![...uselessKeys, key].every(item => uselessProps.includes(item))) {
            tailwind.push(cur.value);
            uselessProps.push(...uselessKeys, key);
          }
        } else {
          dfs(curKeys, cur, [...uselessKeys, key]);
        }
      } else {
        if (cur && curKeys.length !== 0) {
          dfs(curKeys, cur, [...uselessKeys, key]);
        } else {
          if (acc.value && curKeys.length === 0) {
            if (!uselessKeys.every(item => uselessProps.includes(item))) {
              tailwind.push(acc.value);
              uselessProps.push(...uselessKeys);
            }
          }
        }
      }
    });
  }(props);

  const validUselessProps = [...new Set(uselessProps)];
  const useful = Object.fromEntries(Object.entries(rule).filter(([key]) => !validUselessProps.includes(key)));

  return {
    tailwind,
    useful
  };
};
