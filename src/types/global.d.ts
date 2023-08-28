declare global {
  namespace NodeJS {
    interface ProcessEnv {
      URL: string;
      ENV: 'production' | 'development';
      PORT: number;
      BOT_TOKEN: string;
      BOT_ID: string;
      PUBLIC_KEY: string;
    }
  }
}

export {};
