import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { User } from "./lib/types";
import { userSchema } from "./lib/validation";
import { PrismaClient } from "@prisma/client";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";

dotenv.config();
export const app = express();

const frontEnd = process.env.frontend;
const backEnd = process.env.backend;
const worker = process.env.worker;

app.use(express.json());
app.use(helmet());
app.use(compression());

const devWhitelist = [frontEnd, backEnd, worker];

const corsOptions = {
  origin: (origin: any, cb: any) => {
    console.log("[CORS] incoming Origin:", origin);
    if (!origin) return cb(null, true);
    if (process.env.NODE_ENV !== "production") {
      if (devWhitelist.includes(origin)) return cb(null, true);
      return cb(null, true);
    }
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

export function createApp(db: PrismaClient) {
  
  app.get("/", (req: Request, res: Response) => {
    res.send("Hello World!");
  });

  app.post("/v1", (req: Request, res: Response) => {
    const { name, age } = req.body;

    if (!name || !age) {
      return res.status(400).json({ error: "Missing name or age" });
    }

    res.status(200).json({
      name: name.toUpperCase(),
      age: age,
    });
  });

  app.post("/v2", async (req: Request, res: Response) => {
    const payload: User = req.body;
    const parsed = userSchema.safeParse(payload);

    if (parsed.success) {
      try {
        const { email, name, age, gender } = parsed.data;
        name.toUpperCase();
        await db.user.create({
          data: {
            email,
            name,
            age,
            gender,
          },
        });
        res.status(200).json({ "db post success": true });
      } catch (error) {
        res.status(500).json({ error: "db post error" });
      }
    } else {
      res.status(400).json({ error: parsed.error });
    }
  });
  return app;
}
