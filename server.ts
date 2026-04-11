import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Import API handlers
import initiatePayment from "./api/initiate-payment.js";
import paymentSuccess from "./api/payment-success.js";
import paymentFail from "./api/payment-fail.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON and URL-encoded bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes - Mimicking Vercel's /api folder behavior
  app.post("/api/initiate-payment", async (req, res) => {
    console.log("POST /api/initiate-payment called");
    try {
      await initiatePayment(req, res);
    } catch (error) {
      console.error("Error in /api/initiate-payment:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error", details: error.message });
      }
    }
  });
  app.post("/api/payment-success", async (req, res) => {
    console.log("POST /api/payment-success called");
    try {
      await paymentSuccess(req, res);
    } catch (error) {
      console.error("Error in /api/payment-success:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error", details: error.message });
      }
    }
  });
  app.post("/api/payment-fail", async (req, res) => {
    console.log("POST /api/payment-fail called");
    try {
      await paymentFail(req, res);
    } catch (error) {
      console.error("Error in /api/payment-fail:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error", details: error.message });
      }
    }
  });
  // Also handle GET for success/fail if needed (SSLCommerz might use GET for some redirects)
  app.get("/api/payment-success", (req, res) => paymentSuccess(req, res));
  app.get("/api/payment-fail", (req, res) => paymentFail(req, res));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
