import WebSocket from "ws";

export interface UserConnection {
  ws: WebSocket;
  rooms: string[];
}

export class SubManager {
  public subs: Map<string, UserConnection>;
  public rooms: Map<string, Set<string>>;

  constructor() {
    this.subs = new Map();
    this.rooms = new Map();
  }

  public addUser(userId: string, ws: WebSocket) {
    if (!this.subs.has(userId)) {
      this.subs.set(userId, { ws, rooms: [] });
    } else {
      // update ws if reconnecting
      this.subs.get(userId)!.ws = ws;
    }
  }

  public removeUser(userId: string) {
    const user = this.subs.get(userId);
    if (!user) return;
    // remove user from all rooms
    for (const room of [...user.rooms]) {
      this.removeRoom(userId, room);
    }
    this.subs.delete(userId);
  }

  public addRoom(userId: string, roomId: string) {
    const user = this.subs.get(userId);
    if (!user) return;

    if (!user.rooms.includes(roomId)) {
      user.rooms.push(roomId);
    }

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(userId);
  }

  public removeRoom(userId: string, roomId: string) {
    const user = this.subs.get(userId);
    if (!user) return;

    const idx = user.rooms.indexOf(roomId);
    if (idx !== -1) user.rooms.splice(idx, 1);

    const roomSet = this.rooms.get(roomId);
    if (roomSet) {
      roomSet.delete(userId);
      if (roomSet.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  public getUsersInRoom(roomId: string): Array<UserConnection & { id: string }> {
    const set = this.rooms.get(roomId);
    if (!set) return [];
    const users: Array<UserConnection & { id: string }> = [];
    for (const id of set) {
      const u = this.subs.get(id);
      if (u) users.push({ ...u, id });
    }
    return users;
  }

  public roomHasSubscribers(roomId: string): boolean {
    const set = this.rooms.get(roomId);
    return !!set && set.size > 0;
  }
}
