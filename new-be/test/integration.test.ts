// src/test/integration.test.ts
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import request from "supertest";
import dotenv from "dotenv";

import { getPrisma } from "../lib/prisma";
import { createApp } from "../index";

dotenv.config();

let prisma: ReturnType<typeof getPrisma>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  // create and connect real Prisma client against test DB
  prisma = getPrisma();
  await prisma.$connect();
  await prisma.user.deleteMany().catch(() => { /* ignore if table doesn't exist yet */ });
  app = createApp(prisma);
});

afterAll(async () => {
  // cleanup and disconnect
  await prisma.user.deleteMany().catch(() => {});
  await prisma.$disconnect();
});

beforeEach(async () => {
  // keep tests isolated
  await prisma.user.deleteMany();
});

describe("Integration: POST /v1", () => {
  it("should return 400 if name or age is missing", async () => {
    const res = await request(app).post("/v1").send({ name: "Adi" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Missing name or age" });
  });

  it("should return 200 and uppercase name", async () => {
    const res = await request(app).post("/v1").send({ name: "Adi", age: 25 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "ADI", age: 25 });
  });
});

describe("Integration: POST /v2 (real DB)", () => {
  it("should return 400 for invalid payload", async () => {
    const res = await request(app).post("/v2").send({
      email: "invalid-email",
      name: "",
      age: -5,
      gender: "MALE",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 200 and persist user for valid payload", async () => {
    const payload = {
      email: "adi+integration@example.com",
      name: "Adi",
      age: 25,
      gender: "MALE",
    };

    const res = await request(app).post("/v2").send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ "db post success": true });

    // verify user is actually in the DB
    const dbUser = await prisma.user.findUnique({ where: { email: payload.email } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.name).toBe(payload.name);
    expect(dbUser?.age).toBe(payload.age);
    expect(dbUser?.gender).toBe(payload.gender);
  });

  it("should return 500 when DB create fails (simulate)", async () => {
    const payload = {
      email: "adi+err@example.com",
      name: "Adi",
      age: 25,
      gender: "MALE",
    };

    // simulate a DB error by spying on prisma.user.create and forcing a rejection
    const spy = vi.spyOn(prisma.user, "create").mockRejectedValueOnce(new Error("simulated DB failure"));

    const res = await request(app).post("/v2").send(payload);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "db post error" });

    // restore the spy
    spy.mockRestore();
  });
});
