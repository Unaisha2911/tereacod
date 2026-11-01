import { z } from "zod";

/**
 * Shared account/auth validation schemas.
 *
 * Password rule: minimum 10 characters including at least one digit —
 * kept in one place so the hint copy and the schema can never drift.
 */

export const PASSWORD_HINT = "Minimum 10 characters including a number.";

export const passwordSchema = z
  .string()
  .min(10, PASSWORD_HINT)
  .regex(/\d/, PASSWORD_HINT);
