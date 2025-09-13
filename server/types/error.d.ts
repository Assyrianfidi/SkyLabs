declare global {
  interface Error {
    status?: number;
    details?: any;
    code?: string;
    constraint?: string;
    severity?: string;
    category?: string;
  }
}

export {};
