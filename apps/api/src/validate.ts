import { z } from "zod";
import { Request, Response, NextFunction } from "express";
export { z };

export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation error",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export const createSubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  cost: z.number().positive("Cost must be positive"),
  currency: z.string().length(3).optional().default("RUB"),
  billingCycle: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  nextPaymentAt: z.string().min(1, "nextPaymentAt is required"),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSubSchema = z.object({
  name: z.string().min(1).optional(),
  cost: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
  nextPaymentAt: z.string().min(1).optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export const addChannelSchema = z.object({
  id: z.string().min(1, "Channel ID is required"),
  name: z.string().min(1, "Channel name is required"),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
});
