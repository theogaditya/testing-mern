import { PrismaClient } from "@prisma/client";

class DBInstance {

  private static instance: PrismaClient;

  private constructor() {
    console.log("Prisma client initialized");
  }

  public static getInstance(): PrismaClient {
    if (!DBInstance.instance) {
      DBInstance.instance = new PrismaClient();
    }
    return DBInstance.instance;
  }

}

export function getPrisma(): PrismaClient {
  return DBInstance.getInstance();
};