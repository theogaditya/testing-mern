import { createClient, RedisClientType } from "redis";

export class RedisPub {
  private clientPublish: RedisClientType;

  constructor() {
    this.clientPublish = createClient();
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
    this.clientSubscribe = createClient();
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