import type { RequestMessage, ResponseMessage } from '../db-server/config';

export const camelCase = (str: string) =>
  str.replace(/[-_][^-_]/gm, (match) => match.charAt(1).toUpperCase());

export const getComposesValue = (composes: string) =>
  composes.match(/([\S]+)\s+from\s+'([\S]+)'/);

export const send = (message: RequestMessage | ResponseMessage) => {
  process.send?.(message);
};

export const clearInvalidSuffix = (val: string) =>
  val.replaceAll(/\.tsx?$/g, '');

export const promiseStep = <T = any>(
  promises: (() => Promise<T>)[],
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const result: T[] = [];
    const errors: Error[] = [];
    promises
      .reduce(
        (prev, cur) => {
          const promise = prev();
          return () =>
            promise.then(() => {
              return cur()
                .then((data) => {
                  result.push(data);
                })
                .catch((err) => {
                  errors.push(err);
                });
            });
        },
        () => Promise.resolve(),
      )()
      .then(() => {
        if (errors.length) {
          reject(errors);
        } else {
          resolve(result);
        }
      });
  });
};
