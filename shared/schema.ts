import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Dinner planner schemas
export const dinnerPlanRequestSchema = z.object({
  dinnerCount: z.number().min(1).max(7),
  preferences: z.string().optional(),
  timestamp: z.string().optional(),
});

export const mealSchema = z.object({
  mealName: z.string(),
  mealLink: z.string().optional(),
  cuisine: z.string().optional(),
  cookTime: z.string().optional(),
  reason: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // Legacy field for backward compatibility
  name: z.string().optional(),
});

export const dinnerPlanResponseSchema = z.object({
  meals: z.array(mealSchema),
  success: z.boolean().optional(),
  message: z.string().optional(),
});

export type DinnerPlanRequest = z.infer<typeof dinnerPlanRequestSchema>;
export type Meal = z.infer<typeof mealSchema>;
export type DinnerPlanResponse = z.infer<typeof dinnerPlanResponseSchema>;
