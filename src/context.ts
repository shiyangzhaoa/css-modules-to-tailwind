import { EventEmitter } from 'events';

import { EVENT_TYPE, IpcIOSession } from './db-server/client';
import { config } from './db-server/config';

import type { RequestMessage, ResponseMessage } from './db-server/config';

export type Apply = {
  result: Record<string, string[]>;
  removed: string[];
  isUnlinked?: boolean;
};

const events = new EventEmitter();
let seq = 0;
const taskMap = new Map();

events.on(EVENT_TYPE, ({ type, success, body, seq }: ResponseMessage) => {
  if (type !== 'response') return;

  const { resolve, reject } = taskMap.get(seq);

  if (success) {
    resolve(body.data);
  } else {
    reject(body.message);
  }
  taskMap.delete(seq);
});

const IOSession = new IpcIOSession({ eventPort: config.port, events });
IOSession.listen();

const createMessage = <T = any>(message: RequestMessage): Promise<T> => {
  IOSession.event(message);

  return new Promise((resolve, reject) => {
    taskMap.set(message.seq, { resolve, reject });
  });
};

export const getContext = async (key: string): Promise<Apply> => {
  seq++;

  return createMessage({
    seq,
    type: 'request',
    event: 'read',
    body: {
      key,
    },
  });
};

export const setContext = (cacheKey: string, apply: Apply) => {
  seq++;

  return createMessage({
    seq,
    type: 'request',
    event: 'write',
    body: {
      key: cacheKey,
      value: apply,
    },
  });
};
