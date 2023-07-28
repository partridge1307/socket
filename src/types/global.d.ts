declare global {
  namespace NodeJS {
    interface ProcessEnv {
      URL: string;
      ENV: 'production' | 'development';
      PORT: number;
      REDIS_PORT: number;
    }
  }
}

export {};
