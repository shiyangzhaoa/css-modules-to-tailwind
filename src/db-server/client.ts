import EventEmitter from 'events';
import net from 'net';

import { error, success } from '../utils/logger';

import { extractMessage, formatMessage } from './utils';

import type { RequestMessage, ResponseMessage } from './config';

interface Options {
  eventPort: number;
  events: EventEmitter;
}

export const EVENT_TYPE = 'message';

export class IpcIOSession {
  #eventPort: number | undefined;
  #eventSocket: net.Socket | undefined;
  #socketEventQueue: object[] | undefined;
  #events: EventEmitter | undefined;

  constructor(options: Options) {
    this.#eventPort = options.eventPort;
    this.#eventSocket = net.connect({ port: this.#eventPort });
    this.#events = options.events;

    if (this.#socketEventQueue) {
      for (const event of this.#socketEventQueue) {
        this.#writeToEventSocket(event);
      }

      this.#socketEventQueue = undefined;
    }
  }

  #writeMessage(message: RequestMessage | ResponseMessage) {
    this.#events?.emit(EVENT_TYPE, message);
  }

  #writeToEventSocket(message: object) {
    this.#eventSocket!.write(
      formatMessage(message, Buffer.byteLength),
      'utf-8',
    );
  }

  event<T extends object>(message: T) {
    if (!this.#eventSocket) {
      (this.#socketEventQueue || (this.#socketEventQueue = [])).push(message);
      return;
    } else {
      this.#writeToEventSocket(message);
    }
  }

  protected toStringMessage(message: any) {
    return JSON.stringify(message, undefined, 2);
  }

  exit() {
    process.exit(0);
  }

  listen() {
    this.#eventSocket?.on('connect', () => {
      success('Client connected');
    });

    this.#eventSocket?.on('data', (chunk) => {
      extractMessage(chunk.toString()).forEach((res) => {
        this.#writeMessage(JSON.parse(res));
      });
    });

    this.#eventSocket?.on('error', (err) => {
      error(err.message);
    });
  }
}
