import { Redis } from 'ioredis';

declare global {
  var cachedRedis: Redis;
}

let ioRedis;
if (process.env.ENV === 'production') {
  ioRedis = new Redis(process.env.REDIS_PORT);
} else if (process.env.ENV === 'development') {
  if (!global.cachedRedis)
    global.cachedRedis = new Redis(process.env.REDIS_PORT);

  ioRedis = global.cachedRedis;
} else throw Error('Not found env');

export const redis = ioRedis;
