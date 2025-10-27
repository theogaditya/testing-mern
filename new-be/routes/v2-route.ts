import { Router, Request, Response } from "express";
import { Server } from "../index";
import { PrismaClient } from "@prisma/client";
import { User } from "../lib/types";
import { userSchema } from "../lib/validation";

export function v2route(db: PrismaClient) { 
  const router = Router();

  router.post("/v2", async (req: Request, res: Response) => {
    const payload: User = req.body;
    const parsed = userSchema.safeParse(payload);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    try {
      const { email, name, age, gender } = parsed.data;
      await db.user.create({
        data: {
          email,
          name: name,
          age,
          gender,
        },
      });
      res.status(200).json({ "db post success": true });
    } catch (error) {
      res.status(500).json({ error: "db post error" });
    }
  });
   return router;
}
