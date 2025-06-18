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
      
      const webhookUrl = "https://ajschaye.app.n8n.cloud/webhook/d5ea5179-63ff-44da-8b22-1fba75497182";
      
      // Transform data to match webhook format
      const webhookPayload = {
        number_of_meals: validatedData.dinnerCount,
        personalization: validatedData.preferences || "",
        mealTypes: ["dinner"]
      };

      // Create Basic Auth header
      const username = process.env.WEBHOOK_USER;
      const password = process.env.WEBHOOK_PWD;
      
      if (!username || !password) {
        return res.status(500).json({
          success: false,
          message: "Webhook credentials not configured. Please set WEBHOOK_USER and WEBHOOK_PWD environment variables."
        });
      }
      
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

      // Send request to webhook
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error(`Webhook error (${webhookResponse.status}):`, errorText);
        
        return res.status(500).json({
          success: false,
          message: `Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}. ${errorText ? 'Details: ' + errorText : ''}`
        });
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
