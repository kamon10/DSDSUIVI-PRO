import express from "express";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, "whatsapp_config.json");

function getWhatsAppConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (err) {
    console.error("Error reading whatsapp config:", err);
  }
  return { numbers: [], lastAlertSent: 0, alertThreshold: 12000, apiUrl: "", apiKey: "" };
}

function saveWhatsAppConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Error saving whatsapp config:", err);
  }
}

const app = express();
const PORT = 3000;

// VAPID keys should be generated and stored securely
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || "BDDJwlL-37_7jGw-6N9mctOrgvHJwDILLNZo99U0vMfW2Zu8o7BUV4xzUodE_lPZ0QSBdtwse5bZCdsiiIyZX_4";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "Zq4AzquQm-Pst3uXwvZMgPix9pfE_Eg_Q82AN55Gjrg";

const vapidEmail = process.env.VAPID_EMAIL || "mailto:kadioamon@gmail.com";
const vapidSubject = (vapidEmail.startsWith('mailto:') || vapidEmail.startsWith('http')) 
  ? vapidEmail 
  : `mailto:${vapidEmail}`;

webpush.setVapidDetails(
  vapidSubject,
  publicVapidKey,
  privateVapidKey
);

app.use(bodyParser.json());

// In-memory subscription storage (use a DB in production)
let subscriptions: any[] = [];

// API routes
app.get("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("URL parameter is required");
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,application/json,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return res.status(response.status).send(`Proxy error: ${response.statusText}`);
    }
    const text = await response.text();
    res.set('Content-Type', 'text/plain');
    res.send(text);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return res.status(504).send("Proxy timeout: Target URL took too long to respond");
    }
    res.status(500).send(`Proxy exception: ${err.message}`);
  }
});

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

app.post("/api/notifications/broadcast-alert", async (req, res) => {
  const { title, body } = req.body;
  console.log("Broadcasting alert:", title);
  
  // Web Push
  sendNotificationToAll(title || "Alerte Stock Critique", body || "Le volume total est inférieur au seuil de sécurité (12 000 poches)");
  
  // WhatsApp
  const config = getWhatsAppConfig();
  if (config.numbers.length > 0) {
    const message = `🚨 ${title || 'ALERTE'} : ${body || 'Alerte stock critique'}`;
    for (const number of config.numbers) {
      await sendWhatsAppMessage(number, message, config);
    }
  }

  res.status(200).json({ success: true });
});

app.get("/api/admin/whatsapp-config", (req, res) => {
  res.json(getWhatsAppConfig());
});

app.post("/api/admin/whatsapp-config", (req, res) => {
  const config = req.body;
  const current = getWhatsAppConfig();
  saveWhatsAppConfig({ ...current, ...config });
  res.json({ success: true });
});

app.post("/api/admin/whatsapp-check-now", async (req, res) => {
  console.log("[Admin] Manual WhatsApp check triggered");
  await checkDataChanges();
  res.json({ success: true });
});

// Polling logic to check for changes
const COLLECTE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSouyEoRMmp2bAoGgMOtPvN4UfjUetBXnvQBVjPdfcvLfVl2dUNe185DbR2usGyK4UO38p2sb8lBkKN/pub?gid=508129500&single=true&output=csv";
const STOCK_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvWxbSrjoG4XC2svVnGtLwYDEomCtuwW2Ap_vHKP0M6ONojDQU5LKTJj8Srel5k1d1mD9UI3F5R6r_/pub?gid=2055274680&single=true&output=csv";

let lastCollecteHash = "";
let lastStockHash = "";

async function checkDataChanges() {
  try {
    const fetchOptions = {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,application/json,*/*',
        'Cache-Control': 'no-cache'
      }
    };

    // Check Collecte
    const collecteRes = await fetch(COLLECTE_URL + "&_t=" + Date.now(), fetchOptions);
    if (collecteRes.ok) {
      const text = await collecteRes.text();
      if (lastCollecteHash && text !== lastCollecteHash) {
        console.log("Change detected in Collecte!");
        sendNotificationToAll("Nouvelle entrée : Prélèvements mis à jour", "Les données de collecte ont été actualisées.");
      }
      lastCollecteHash = text;
    }

    // Check Stock
    const stockRes = await fetch(STOCK_URL + "&_t=" + Date.now(), fetchOptions);
    if (stockRes.ok) {
      const text = await stockRes.text();
      console.log(`[Sync] Stock data fetched (${text.length} chars). Preview: ${text.substring(0, 100)}`);
      
      // WhatsApp Alert Logic
      const config = getWhatsAppConfig();
      const totalStock = calculateTotalStock(text);
      console.log(`[Alert] Current Total Stock calculated: ${totalStock} (Threshold: ${config.alertThreshold})`);

      if (totalStock > 0 && totalStock < config.alertThreshold) {
        const now = Date.now();
        const lastSent = config.lastAlertSent || 0;
        const hoursSinceLast = (now - lastSent) / (1000 * 60 * 60);
        
        console.log(`[Alert] Stock is below threshold. Last alert sent ${hoursSinceLast.toFixed(2)} hours ago.`);

        // Alert every 4 hours if stock is still low
        if (now - lastSent > 4 * 60 * 60 * 1000) {
          console.log("[Alert] CRITICAL STOCK DETECTED! Sending WhatsApp alerts to", config.numbers.length, "numbers");
          const message = `🚨 ALERTE STOCK CRITIQUE : Le stock national est à ${totalStock.toLocaleString()} poches. Seuil de sécurité (${config.alertThreshold.toLocaleString()}) non atteint.`;
          
          if (config.numbers.length > 0) {
            for (const number of config.numbers) {
              await sendWhatsAppMessage(number, message, config);
            }
            config.lastAlertSent = now;
            saveWhatsAppConfig(config);
          } else {
            console.log("[Alert] No WhatsApp numbers configured.");
          }
        } else {
          console.log("[Alert] Skipping WhatsApp alert (cooldown active).");
        }
      } else if (totalStock >= config.alertThreshold) {
        console.log("[Alert] Stock is healthy.");
      }

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

function calculateTotalStock(csvText: string): number {
  try {
    if (!csvText) return 0;
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== "");
    if (lines.length < 2) return 0;
    
    // Detect separator
    const firstLine = lines[0];
    const sep = firstLine.includes(';') ? ';' : ',';
    
    const headers = firstLine.split(sep).map(h => h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim());
    console.log("[Parser] Stock Headers for calculation:", headers);

    const qtyIdx = headers.findIndex(h => h.includes('QUANTITE') || h.includes('QTE') || h.includes('NB') || h.includes('NOMBRE') || h.includes('STOCK'));
    
    if (qtyIdx === -1) {
      console.warn("[Parser] No quantity column found in stock CSV, counting rows.");
      return lines.length - 1;
    }

    let total = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep);
      const rawVal = cols[qtyIdx];
      if (!rawVal) continue;
      
      const val = parseFloat(rawVal.replace(/[^\d,.-]/g, '').replace(',', '.') || "0");
      if (!isNaN(val)) total += val;
    }
    return Math.round(total);
  } catch (err) {
    console.error("Error calculating total stock:", err);
    return 0;
  }
}

async function sendWhatsAppMessage(number: string, message: string, config: any) {
  if (!number) return;
  
  // Clean number (remove +, spaces, etc)
  const cleanNumber = number.replace(/\D/g, '');
  
  console.log(`Sending WhatsApp to ${cleanNumber}: ${message}`);

  // If user provided a custom API (like CallMeBot or a private gateway)
  if (config.apiUrl) {
    try {
      const url = config.apiUrl
        .replace('[NUMBER]', cleanNumber)
        .replace('[MESSAGE]', encodeURIComponent(message))
        .replace('[APIKEY]', config.apiKey || '');
      
      await fetch(url);
      console.log(`WhatsApp sent to ${cleanNumber} via custom API`);
    } catch (err) {
      console.error(`Failed to send WhatsApp to ${cleanNumber}:`, err);
    }
  } else {
    // Default: Log it if no API is configured
    console.log("WhatsApp API not configured. Message logged only.");
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
