import { PrismaClient } from "@prisma/client";
import { Server } from "./index";
import dotenv from "dotenv";
import { newWsInstance } from "./realTime/websock";
// import { newRedisPubSub, newRedisSub } from "./redisPubSub";

dotenv.config();

const server = new Server();
const app = server.getApp();

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const wsPort:number = Number(process.env.WS_PORT);
newWsInstance(wsPort);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Shutting down gracefully...");
  process.exit(0);
});
