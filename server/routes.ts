import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dinnerPlanRequestSchema, type DinnerPlanResponse } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dinner planner API endpoint
  app.post("/api/plan-dinners", async (req, res) => {
    try {
      // Validate request body
      const validatedData = dinnerPlanRequestSchema.parse(req.body);
      
      // Get webhook URL from environment variables
      const webhookUrl = process.env.DINNER_PLANNER_WEBHOOK_URL || process.env.WEBHOOK_URL;
      
      if (!webhookUrl) {
        return res.status(500).json({
          success: false,
          message: "Webhook URL not configured. Please set DINNER_PLANNER_WEBHOOK_URL or WEBHOOK_URL environment variable."
        });
      }

      // Send request to webhook
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData)
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook request failed with status ${webhookResponse.status}`);
      }

      const webhookData = await webhookResponse.json();
      
      // Return the webhook response to frontend
      res.json(webhookData);
      
    } catch (error) {
      console.error('Error planning dinners:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Failed to plan dinners. Please try again later."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
