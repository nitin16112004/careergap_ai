import { z } from "zod";

export const adminUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(["user", "admin"]),
  }),
});
