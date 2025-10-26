import { z } from "zod";
import { Gender } from "@prisma/client"; 

export const genderEnum = z.nativeEnum(Gender);

export const userSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .trim(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long"),
  age: z
    .number()
    .int("Age must be an integer")
    .min(0, "Age cannot be negative")
    .max(150, "Unrealistic age"),
  gender: genderEnum,
});

export type UserInput = z.infer<typeof userSchema>;
