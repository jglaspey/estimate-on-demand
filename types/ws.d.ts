declare module 'ws' {
  export class WebSocket {
    constructor(url: string | URL, options?: any);
    on(event: string, listener: (...args: any[]) => void): this;
    send(data: any): void;
    close(): void;
    readyState: number;
    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;
  }
  
  export class WebSocketServer {
    constructor(options?: any);
    on(event: string, listener: (...args: any[]) => void): this;
    clients: Set<WebSocket>;
  }
}