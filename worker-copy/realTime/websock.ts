import { WebSocketServer, WebSocket } from "ws";
import { SubManager } from "./pubsubManager";
import { RedisPub, RedisSub } from "./redisPubSub";

const subscribes = new SubManager();

export class WebSocketManager {
  private wss: WebSocketServer;
  private redisPub: RedisPub;
  private redisSub: RedisSub;
  // track which rooms we have subscribed to on Redis
  private subscribedRooms: Set<string>;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port, host: "0.0.0.0" });
    this.redisPub = new RedisPub();
    this.redisSub = new RedisSub();
    this.subscribedRooms = new Set();
    this.initialize();
  }

  private initialize() {
    this.wss.on("connection", (ws: WebSocket) => {
      const id = randomId();
      console.log(`[WS] new connection ${id}`);
      subscribes.addUser(id, ws);

      ws.on("error", console.error);

      ws.on("message", (raw) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch (err) {
          console.warn("[WS] Invalid JSON received:", raw.toString());
          return;
        }

        if (msg.type === "subscribe") {
          subscribes.addRoom(id, msg.room);
          console.log("[WS] created/added to room:", msg.room);

          // subscribe to Redis channel only once
          if (!this.subscribedRooms.has(msg.room)) {
            this.subscribedRooms.add(msg.room);
            // register Redis callback for this channel
            this.redisSub.clientSubscriber().subscribe(msg.room, (message: string) => {
              // broadcast redis message to every WS user in this room
              const users = subscribes.getUsersInRoom(msg.room);
              for (const u of users) {
                try {
                  u.ws.send(JSON.stringify({ type: "message", message, room: msg.room }));
                } catch (err) {
                  console.error("[WS] Error sending to user", u.id, err);
                }
              }
            }).catch((err: any) => {
              console.error("[WS] Error subscribing to redis channel:", err);
            });
          }

          console.log("[WS] Subscribed to room:", msg.room);
        }

        if (msg.type === "exchangeMessage") {
          // forward to redis
          this.redisPub.clientPublisher().publish(msg.room, msg.message)
            .then(() => {
              console.log("[WS] Published message to room:", msg.room);
            })
            .catch((err: any) => {
              console.error("[WS] Redis publish error:", err);
            });
        }

        if (msg.type === "unsubscribe") {
          // remove user from our maps
          subscribes.removeRoom(id, msg.room);
          console.log("[WS] removed user from room:", msg.room);

          // if no one left in this room, unsubscribe from redis
          if (!subscribes.roomHasSubscribers(msg.room) && this.subscribedRooms.has(msg.room)) {
            this.subscribedRooms.delete(msg.room);
            this.redisSub.clientSubscriber().unsubscribe(msg.room).catch((err: any) => {
              console.error("[WS] Error unsubscribing from redis:", err);
            });
            console.log("[WS] unsubscribed redis from room:", msg.room);
          }
        }
      });

      ws.on("close", () => {
        // remove user from all rooms and check unsubs
        const user = subscribes.subs.get(id);
        if (user) {
          for (const room of [...user.rooms]) {
            subscribes.removeRoom(id, room);
            if (!subscribes.roomHasSubscribers(room) && this.subscribedRooms.has(room)) {
              this.subscribedRooms.delete(room);
              this.redisSub.clientSubscriber().unsubscribe(room).catch((err: any) => {
                console.error("[WS] Error unsubscribing from redis on close:", err);
              });
              console.log("[WS] unsubscribed redis from room (on close):", room);
            }
          }
        }
        subscribes.removeUser(id);
        console.log(`[WS] connection ${id} closed`);
      });

      // send a JSON welcome message (safer than raw text)
      try {
        ws.send(JSON.stringify({ type: "connected", id }));
      } catch (err) {
        console.warn("[WS] could not send welcome message", err);
      }
    });

    console.log(`[WS] WebSocket server running on port ${this.wss.options.port ?? "unknown"}`);
  }

  public getWSServer(): WebSocketServer {
    return this.wss;
  }
}

function randomId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

export function newWsInstance(port: number) {
  new WebSocketManager(port);
}

export function getWSServer() {
  return WebSocketManager.prototype.getWSServer();
}
