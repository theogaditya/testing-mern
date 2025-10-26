import { describe, expect, it,vi,beforeEach } from "vitest";
import request from "supertest";
import prisma  from "../lib/_mocks_/prisma";
import { createApp } from "../index";

const app = createApp(prisma);

describe("POST /v1", () => {
  it("should return 400 if name or age is missing", async () => {
    const res = await request(app)
      .post("/v1")
      .send({ name: "Adi" }); 

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Missing name or age" });
  });

  it("should return 200 and uppercase name", async () => {
    const res = await request(app)
      .post("/v1")
      .send({ name: "Adi", age: 25 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "ADI", age: 25 });
  });
});


describe("POST /v2", () => {
  beforeEach(() => {
    // reset mock between tests
    prisma.user.create.mockReset();
  });

  it("should return 400 for invalid payload", async () => {
    const res = await request(app)
      .post("/v2")
      .send({
        email: "invalid-email",
        name: "",
        age: -5,
        gender: "MALE",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 200 and call prisma.user.create for valid payload", async () => {
    prisma.user.create.mockResolvedValueOnce({
      id: 1,
      email: "adi@example.com",
      name: "Adi",
      age: 25,
      gender: "MALE",
    });
    
    const payload = {
      email: "adi@example.com",
      name: "Adi",
      age: 25,
      gender: "MALE",
    };

    const res = await request(app).post("/v2").send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ "db post success": true });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: payload,
    });
  });

  it("should return 500 if prisma.user.create throws error", async () => {
    prisma.user.create.mockRejectedValueOnce(new Error("DB error"));

    const payload = {
      email: "adi@example.com",
      name: "Adi",
      age: 25,
      gender: "MALE",
    };

    const res = await request(app).post("/v2").send(payload);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "db post error" });
  });
});