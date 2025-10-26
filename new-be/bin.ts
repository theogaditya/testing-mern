import { getPrisma } from "./lib/prisma";
import { createApp } from "./index";
import express, { Request, Response } from "express";

const prisma = getPrisma(); 
const app = createApp(prisma);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});