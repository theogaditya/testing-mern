import { describe, it, expect, beforeAll, afterAll } from "vitest";
import WebSocket from "ws";
import { WebSocketManager } from "../realTime/websock";

// test port
const TEST_PORT = 8090;
let wsManager: WebSocketManager;

describe("WebSocketManager", () => {
  beforeAll(() => {
    wsManager = new WebSocketManager(TEST_PORT);
  });

  afterAll(() => {
    wsManager.getWSServer().close();
  });

  it("should start and accept WebSocket connections", async () => {
    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      client.on("open", () => resolve());
      client.on("error", (err) => reject(err));
    });

    expect(client.readyState).toBe(WebSocket.OPEN);

    client.close();
  });

  it("should handle subscribe messages correctly", async () => {
    const client = new WebSocket(`ws://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve, reject) => {
      client.on("open", () => resolve());
      client.on("error", (err) => reject(err));
    });

    const subscribeMsg = JSON.stringify({ type: "subscribe", room: "room1" });

    client.send(subscribeMsg);

    // give it a small delay to process
    await new Promise((r) => setTimeout(r, 100));

    expect(wsManager.getWSServer().clients.size).toBeGreaterThan(0);

    client.close();
  });

it("should broadcast messages to all clients in the same room", async () => {
  const c1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
  const c2 = new WebSocket(`ws://localhost:${TEST_PORT}`);

  const messagesReceived: string[] = [];

  c2.on("message", (msg) => messagesReceived.push(msg.toString()));

  await Promise.all([
    new Promise<void>((resolve) => c1.on("open", resolve)),
    new Promise<void>((resolve) => c2.on("open", resolve)),
  ]);

  c1.send(JSON.stringify({ type: "subscribe", room: "room1" }));
  c2.send(JSON.stringify({ type: "subscribe", room: "room1" }));

  await new Promise((r) => setTimeout(r, 100));

  c1.send(JSON.stringify({ type: "exchangeMessage", room: "room1", message: "hello" }));

  await new Promise((r) => setTimeout(r, 300));

  expect(messagesReceived.some((m) => m.includes("hello"))).toBe(true);

  c1.close();
  c2.close();
});

});
