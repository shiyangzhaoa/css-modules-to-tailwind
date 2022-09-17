export function extractMessage(message: string): string[] {
  const lines = message.split(/\r?\n/);

  const data: string[] = [];

  lines.forEach((res) => {
    try {
      JSON.parse(res);
      data.push(res);
    } catch {
      //
    }
  });

  return data;
}

export function formatMessage<T extends Record<string, any>>(
  msg: T,
  byteLength: (s: string, encoding: any) => number,
): string {
  const json = JSON.stringify(msg);

  const len = byteLength(json, 'utf8');
  return `Content-Length: ${1 + len}\r\n\r\n${json}\r\n`;
}
