import { createClient, RedisClientType } from "redis";
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

export class RedisPub {
  private clientPublish: RedisClientType;

  constructor() {
    this.clientPublish = createClient({url: REDIS_URL});
    this.initalize();
  }
  private async initalize() {
    this.clientPublish.on("error", (err:any) => console.log("Redis Client Error", err));

    await this.clientPublish.connect();
  }

  public clientPublisher() {
    return this.clientPublish;
  }
}

export class RedisSub {
  private clientSubscribe: RedisClientType;

  constructor() {
    this.clientSubscribe = createClient({url: REDIS_URL});
    this.initalize();
  }
  private async initalize() {
    this.clientSubscribe.on("error", (err:any) => console.log("Redis Client Error", err));

    await this.clientSubscribe.connect();
  }

  public clientSubscriber() {
    return this.clientSubscribe;
  }
}

// export function newRedisPubSub() {
//   return new RedisPub();
// }
// export function newRedisSub() {
//   return new RedisSub();
// }