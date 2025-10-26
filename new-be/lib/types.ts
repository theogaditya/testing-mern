import { Gender } from "@prisma/client";

export type User = {
  email: string;
  name: string;
  age: number;
  gender: Gender;
};