import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

dotenv.config();

export class Server {
  private app: Express;
  private db: PrismaClient;
  private readonly frontEnd?: string;
  private readonly backEnd?: string;
  private readonly worker?: string;

  constructor() {
    this.app = express();

    this.frontEnd = process.env.frontend;
    this.backEnd = process.env.backend;
    this.worker = process.env.worker;

    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private initializeMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(helmet());
    this.app.use(compression());

    const devWhitelist = [this.frontEnd, this.backEnd, this.worker];

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

    this.app.use(cors(corsOptions));
  }

  private initializeRoutes(): void {
    
    this.app.get("/", (req: Request, res: Response) => {
      res.send("Hello worker");
    });

  }

  public getApp(): Express {
    return this.app;
  }

}
