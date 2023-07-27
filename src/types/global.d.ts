declare global {
  namespace NodeJS {
    interface ProcessEnv {
      URL: string;
      ENV: 'production' | 'development';
    }
  }
}

export {};
