import express from "express";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// VAPID keys should be generated and stored securely
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || "BDDJwlL-37_7jGw-6N9mctOrgvHJwDILLNZo99U0vMfW2Zu8o7BUV4xzUodE_lPZ0QSBdtwse5bZCdsiiIyZX_4";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "Zq4AzquQm-Pst3uXwvZMgPix9pfE_Eg_Q82AN55Gjrg";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:kadioamon@gmail.com",
  publicVapidKey,
  privateVapidKey
);

app.use(bodyParser.json());

// In-memory subscription storage (use a DB in production)
let subscriptions: any[] = [];

// API routes
app.post("/api/notifications/subscribe", (req, res) => {
  const subscription = req.body;
  
  // Check if already exists
  const exists = subscriptions.find(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    console.log("New subscription added. Total:", subscriptions.length);
  }
  
  res.status(201).json({});
});

app.post("/api/notifications/unsubscribe", (req, res) => {
  const subscription = req.body;
  subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
  console.log("Subscription removed. Total:", subscriptions.length);
  res.status(200).json({});
});

// Polling logic to check for changes
const COLLECTE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSouyEoRMmp2bAoGgMOtPvN4UfjUetBXnvQBVjPdfcvLfVl2dUNe185DbR2usGyK4UO38p2sb8lBkKN/pub?gid=508129500&single=true&output=csv";
const STOCK_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvWxbSrjoG4XC2svVnGtLwYDEomCtuwW2Ap_vHKP0M6ONojDQU5LKTJj8Srel5k1d1mD9UI3F5R6r_/pub?gid=2055274680&single=true&output=csv";

let lastCollecteHash = "";
let lastStockHash = "";

async function checkDataChanges() {
  try {
    // Check Collecte
    const collecteRes = await fetch(COLLECTE_URL + "&_t=" + Date.now());
    if (collecteRes.ok) {
      const text = await collecteRes.text();
      if (lastCollecteHash && text !== lastCollecteHash) {
        console.log("Change detected in Collecte!");
        sendNotificationToAll("Nouvelle entrée : Prélèvements mis à jour", "Les données de collecte ont été actualisées.");
      }
      lastCollecteHash = text;
    }

    // Check Stock
    const stockRes = await fetch(STOCK_URL + "&_t=" + Date.now());
    if (stockRes.ok) {
      const text = await stockRes.text();
      if (lastStockHash && text !== lastStockHash) {
        console.log("Change detected in Stock!");
        sendNotificationToAll("Alerte Stock : Changement détecté", "Le niveau des stocks a été mis à jour.");
      }
      lastStockHash = text;
    }
  } catch (err) {
    console.error("Error checking data changes:", err);
  }
}

function sendNotificationToAll(title: string, body: string) {
  const payload = JSON.stringify({ title, body });
  
  subscriptions.forEach(subscription => {
    webpush.sendNotification(subscription, payload).catch(error => {
      console.error("Error sending notification:", error);
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription expired or no longer valid
        subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
      }
    });
  });
}

// Poll every 5 minutes
setInterval(checkDataChanges, 5 * 60 * 1000);
// Initial check after 30 seconds to let the server start
setTimeout(checkDataChanges, 30000);

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
