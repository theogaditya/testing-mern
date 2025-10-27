// test/ws.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import WebSocket from "ws";

// ----- Mock redisPubSub BEFORE importing the WebSocketManager -----
// the mock provides in-process pub/sub behavior so tests don't need real Redis.
vi.mock("../realTime/redisPubSub", () => {
  // simple in-memory channel registry
  const channels: Map<string, Set<(message: string) => void>> = new Map();

  const subscriberImpl = {
    subscribe: async (channel: string, cb: (message: string) => void) => {
      if (!channels.has(channel)) channels.set(channel, new Set());
      channels.get(channel)!.add(cb);
      return Promise.resolve();
    },
    unsubscribe: async (channel: string) => {
      channels.delete(channel);
      return Promise.resolve();
    },
  };

  const publisherImpl = {
    publish: async (channel: string, message: string) => {
      const set = channels.get(channel);
      if (!set) return Promise.resolve(0);
      // call subscribers synchronously (tests await small delays afterwards)
      for (const cb of Array.from(set)) {
        try {
          cb(message);
        } catch {
          // swallow subscriber errors so tests don't throw here
        }
      }
      return Promise.resolve(set.size);
    },
  };

  return {
    RedisPub: class {
      clientPublish = publisherImpl;
      constructor() {}
      clientPublisher() {
        return this.clientPublish;
      }
    },
    RedisSub: class {
      clientSubscribe = subscriberImpl;
      constructor() {}
      clientSubscriber() {
        return this.clientSubscribe;
      }
    },
  };
});

// Now import the WebSocketManager (it will use the mocked Redis classes)
import { WebSocketManager } from "../realTime/websock";

// test port
const TEST_PORT = 8090;
let wsManager: WebSocketManager;

describe("WebSocketManager", () => {
  beforeAll(() => {
    // start WS server on test port
    wsManager = new WebSocketManager(TEST_PORT);
  });

  afterAll(async () => {
    // close server and give it a tick
    wsManager.getWSServer().close();
    await new Promise((r) => setTimeout(r, 50));
  });

  it("should start and accept WebSocket connections", async () => {
    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      client.on("open", () => resolve());
      client.on("error", (err) => reject(err));
    });

    expect(client.readyState).toBe(WebSocket.OPEN);

    client.close();
  }, 5000);

  it("should handle subscribe messages correctly", async () => {
    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      client.on("open", () => resolve());
      client.on("error", (err) => reject(err));
    });

    // send subscribe
    client.send(JSON.stringify({ type: "subscribe", room: "room1" }));

    // small delay to allow server-side registration
    await new Promise((r) => setTimeout(r, 120));

    // at least one client connection should exist on server
    expect(wsManager.getWSServer().clients.size).toBeGreaterThan(0);

    client.close();
  }, 5000);

  it("should broadcast messages to all clients in the same room", async () => {
    const c1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
    const c2 = new WebSocket(`ws://localhost:${TEST_PORT}`);

    // collect raw messages received by c2
    const messagesReceived: string[] = [];

    // register message listener early (before subscribe messages)
    c2.on("message", (msg) => {
      messagesReceived.push(msg.toString());
    });

    // wait for both to open
    await Promise.all([
      new Promise<void>((resolve) => c1.on("open", resolve)),
      new Promise<void>((resolve) => c2.on("open", resolve)),
    ]);

    // subscribe both clients to same room
    c1.send(JSON.stringify({ type: "subscribe", room: "room1" }));
    c2.send(JSON.stringify({ type: "subscribe", room: "room1" }));

    // give server a moment to register subscriptions and Redis mock to hook callbacks
    await new Promise((r) => setTimeout(r, 150));

    // send broadcast from c1
    c1.send(JSON.stringify({ type: "exchangeMessage", room: "room1", message: "hello" }));

    // wait for message propagation
    await new Promise((r) => setTimeout(r, 250));

    // ensure c2 got the message (message payload contains "hello")
    const gotHello = messagesReceived.some((m) => m.includes("hello"));
    expect(gotHello).toBe(true);

    c1.close();
    c2.close();
  }, 5000);

  it("should NOT broadcast to clients in different rooms", async () => {
    const a = new WebSocket(`ws://localhost:${TEST_PORT}`);
    const b = new WebSocket(`ws://localhost:${TEST_PORT}`);

    const bMessages: string[] = [];
    b.on("message", (m) => bMessages.push(m.toString()));

    await Promise.all([
      new Promise<void>((resolve) => a.on("open", resolve)),
      new Promise<void>((resolve) => b.on("open", resolve)),
    ]);

    // a subscribes to roomA, b subscribes to roomB
    a.send(JSON.stringify({ type: "subscribe", room: "roomA" }));
    b.send(JSON.stringify({ type: "subscribe", room: "roomB" }));

    await new Promise((r) => setTimeout(r, 150));

    // a publishes to roomA
    a.send(JSON.stringify({ type: "exchangeMessage", room: "roomA", message: "secret-A" }));

    await new Promise((r) => setTimeout(r, 250));

    // b should NOT receive secret-A
    expect(bMessages.some((m) => m.includes("secret-A"))).toBe(false);

    a.close();
    b.close();
  }, 5000);
});
