export const config = {
  port: 7879,
};

export interface ResponseMessage {
  seq: number;
  type: 'response';
  event: 'read' | 'write' | 'reset' | 'destroy' | 'init';
  success: boolean;
  body: {
    message?: string;
    data?: Record<string, any>;
  };
}

export type RequestMessage =
  | {
      seq: number;
      type: 'request';
      event: 'read';
      body: {
        key: string;
      };
    }
  | {
      seq: number;
      type: 'request';
      event: 'write';
      body: {
        key: string;
        value: Record<string, any>;
      };
    }
  | {
      seq: number;
      type: 'request';
      event: 'reset';
      body: {
        key: string;
      };
    }
  | {
      seq: number;
      type: 'request';
      event: 'destroy';
      body: Record<string, any>;
    }
  | {
      seq: number;
      type: 'request';
      event: 'init';
      body: Record<string, any>;
    };
