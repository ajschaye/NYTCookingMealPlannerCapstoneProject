import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dinnerPlanRequestSchema, type DinnerPlanResponse } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      webhookConfigured: !!(process.env.WEBHOOK_USER && process.env.WEBHOOK_PWD),
      deploymentType: process.env.NODE_ENV === "production" ? "full-stack" : "development",
      serverRunning: true
    });
  });

  // Webhook connectivity test endpoint
  app.post("/api/test-webhook", async (req, res) => {
    try {
      const webhookUrl = process.env.WEBHOOK_URL || "https://ajschaye.app.n8n.cloud/webhook/d5ea5179-63ff-44da-8b22-1fba75497182";
      const username = process.env.WEBHOOK_USER;
      const password = process.env.WEBHOOK_PWD;
      
      if (!username || !password) {
        return res.status(500).json({
          success: false,
          message: "Webhook credentials not configured"
        });
      }
      
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
      const testPayload = {
        number_of_meals: 1,
        personalization: "Test connection",
        mealTypes: ["dinner"]
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basicAuth}`,
            'User-Agent': 'DinnerPlanner/1.0'
          },
          body: JSON.stringify(testPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        const responseData = await response.text();
        
        res.json({
          success: true,
          status: response.status,
          statusText: response.statusText,
          url: webhookUrl,
          responsePreview: responseData.substring(0, 200)
        });
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        res.status(500).json({
          success: false,
          error: fetchError.message,
          type: fetchError.name,
          url: webhookUrl
        });
      }
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Test failed",
        error: error.message
      });
    }
  });

  // Dinner planner API endpoint
  app.post("/api/plan-dinners", async (req, res) => {
    try {
      // Validate request body
      const validatedData = dinnerPlanRequestSchema.parse(req.body);
      
      const webhookUrl = process.env.WEBHOOK_URL || "https://ajschaye.app.n8n.cloud/webhook/d5ea5179-63ff-44da-8b22-1fba75497182";
      
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
        console.error("Webhook credentials missing:", { username: !!username, password: !!password });
        return res.status(500).json({
          success: false,
          message: "Webhook credentials not configured. Please set WEBHOOK_USER and WEBHOOK_PWD environment variables."
        });
      }
      
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
      
      console.log(`Making webhook request to: ${webhookUrl}`);

      // Send request to webhook with timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${basicAuth}`,
            'User-Agent': 'DinnerPlanner/1.0'
          },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error(`Webhook error (${webhookResponse.status}):`, errorText);
          console.error('Request URL:', webhookUrl);
          console.error('Request payload:', JSON.stringify(webhookPayload, null, 2));
          
          return res.status(500).json({
            success: false,
            message: `Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}. ${errorText ? 'Details: ' + errorText : ''}`,
            debug: process.env.NODE_ENV === 'development' ? {
              url: webhookUrl,
              status: webhookResponse.status,
              statusText: webhookResponse.statusText,
              error: errorText
            } : undefined
          });
        }

        const webhookData = await webhookResponse.json();
        
        // Return the webhook response to frontend
        res.json(webhookData);
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('Webhook fetch error:', fetchError);
        console.error('Request URL:', webhookUrl);
        
        if (fetchError.name === 'AbortError') {
          return res.status(500).json({
            success: false,
            message: "Webhook request timed out after 30 seconds"
          });
        }
        
        return res.status(500).json({
          success: false,
          message: `Network error connecting to webhook: ${fetchError.message}`,
          debug: process.env.NODE_ENV === 'development' ? {
            url: webhookUrl,
            error: fetchError.message,
            type: fetchError.name
          } : undefined
        });
      }
      
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
