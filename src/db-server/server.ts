import net from 'net';

import { error, success } from '../utils/logger';
import { DB } from '../utils/db';

import { config } from './config';
import { extractMessage, formatMessage } from './utils';

import type { RequestMessage, ResponseMessage } from './config';
import { Apply } from '../context';

const tcp = net.createServer((socket) => {
  socket.on('data', (chunk) => {
    extractMessage(chunk.toString()).forEach((res) => {
      perform(JSON.parse(res), socket);
    });
  });

  socket.on('error', (err) => {
    error(err.message);
  });
});

tcp.listen(config.port, () => {
  success('Socket on');
});

const db = new DB('cache');

async function perform(
  { event, body, seq }: RequestMessage,
  socket: net.Socket,
) {
  const send = (message: ResponseMessage): Promise<any> | void => {
    socket.write(formatMessage(message, Buffer.byteLength), 'utf-8');
  };

  const createResponse = (data: Apply | null = null) => {
    return {
      seq,
      event,
      type: 'response',
      success: true,
      body: {
        data,
        message: 'success',
      },
    } as const;
  };

  switch (event) {
    case 'read':
      const data = await db.read(body.key);
      send(createResponse(data));
      break;
    case 'write':
      await db.write(body.key, body.value);
      send(createResponse());
      break;
    case 'init':
      db.init();
      send(createResponse());
      break;
    case 'destroy':
      db.destroy();
      send(createResponse());
      break;
    default:
      send({
        seq,
        event,
        type: 'response',
        success: false,
        body: {
          data: null,
          message: 'invalid event',
        },
      });
      break;
  }
}

process.on('message', (action) => {
  if (action === 'destroy') {
    db.destroy();
    tcp.close();
    process.exit(1);
  }
});
