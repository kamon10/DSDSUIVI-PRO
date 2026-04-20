import express from "express";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fetch from "node-fetch";

// Database connection pool
const isDbConfigured = false;

console.log("[SERVER] Starting initialization... VERSION 2.1");
console.log("[SERVER] NODE_ENV:", process.env.NODE_ENV);
console.log("[SERVER] VERCEL:", process.env.VERCEL);

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(process.env.VERCEL ? "/tmp" : __dirname, "whatsapp_config.json");

function getWhatsAppConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (err) {
    console.error("Error reading whatsapp config:", err);
  }
  return { numbers: [], lastAlertSent: 0, alertThreshold: 12000, apiUrl: "", groupApiUrl: "", groupId: "", apiKey: "" };
}

function saveWhatsAppConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Error saving whatsapp config:", err);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// VAPID keys should be generated and stored securely
let publicVapidKey = process.env.VAPID_PUBLIC_KEY || "BNGiQoS7ReLQJjPSaue33zzETKVFbb2XYWoByI2kU6pU4D1qROvRRMQ4fpp92iC1XVxFiQDjk3pCKiqshXesMlk";
let privateVapidKey = process.env.VAPID_PRIVATE_KEY || "Q-717Ebgg2P66AzR5aOG_2RPZezRy-H7c1pG0vDBMWI";

const vapidEmail = process.env.VAPID_EMAIL || "mailto:kadioamon@gmail.com";
const vapidSubject = (vapidEmail.startsWith('mailto:') || vapidEmail.startsWith('http')) 
  ? vapidEmail 
  : `mailto:${vapidEmail}`;

function setupVapid() {
  try {
    console.log("[SERVER] Setting up VAPID details...");
    if (!publicVapidKey || !privateVapidKey) {
      throw new Error("VAPID keys are missing");
    }
    webpush.setVapidDetails(
      vapidSubject,
      publicVapidKey,
      privateVapidKey
    );
    console.log("[SERVER] VAPID details set successfully");
  } catch (err) {
    console.warn("[SERVER] Provided VAPID keys invalid or missing, generating temporary ones...");
    try {
      const keys = webpush.generateVAPIDKeys();
      publicVapidKey = keys.publicKey;
      privateVapidKey = keys.privateKey;
      webpush.setVapidDetails(
        vapidSubject,
        publicVapidKey,
        privateVapidKey
      );
      console.log("[SERVER] VAPID details set successfully with generated keys. Note: These will change on restart unless saved to environment variables.");
    } catch (innerErr) {
      console.error("[SERVER] Fatal: Failed to set VAPID details even with generated keys:", innerErr);
    }
  }
}

setupVapid();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// In-memory subscription storage (use a DB in production)
let subscriptions: any[] = [];

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// In-memory cache for proxy requests
const proxyCache = new Map<string, { text: string, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

app.get("/api/proxy", async (req, res) => {
  let targetUrl = req.query.url as string;
  
  // Si l'URL est encodée plusieurs fois ou contient des paramètres complexes
  if (!targetUrl && req.originalUrl.includes('url=')) {
    const parts = req.originalUrl.split('url=');
    if (parts.length > 1) {
      targetUrl = decodeURIComponent(parts[1]);
    }
  }

  if (!targetUrl) {
    return res.status(400).send("URL parameter is required");
  }

  // Check cache
  const cached = proxyCache.get(targetUrl);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Proxy] Cache hit for: ${targetUrl.substring(0, 50)}...`);
    res.setHeader('X-Cache', 'HIT');
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Access-Control-Allow-Origin', '*');
    return res.send(cached.text);
  }
  
  console.log(`[Proxy] Request for: ${targetUrl.substring(0, 100)}...`);

  // Désactiver le cache navigateur (on gère notre propre cache serveur)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Cache', 'MISS');
  
  const maxRetries = 2;
  let lastError = null;

  for (let i = 0; i <= maxRetries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const startTime = Date.now();
    try {
      console.log(`[Proxy] Attempt ${i+1} for ${targetUrl.substring(0, 50)}...`);
      const response = await fetch(targetUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/csv, text/plain, */*',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });
      
      if (response.ok) {
        const text = await response.text();
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        const trimmedText = text.trim();
        if (trimmedText.startsWith("<!DOCTYPE") || trimmedText.startsWith("<html")) {
          const preview = trimmedText.substring(0, 200).replace(/\n/g, ' ');
          console.warn(`[Proxy] Received HTML instead of CSV after ${duration}ms (Preview: "${preview}")`);
          
          if (trimmedText.includes("ServiceLogin") || trimmedText.includes("Google Accounts")) {
            lastError = new Error("Google Sheets requires authentication (not public)");
          } else {
            lastError = new Error("Received HTML content (possible block or redirect)");
          }
          continue;
        }
        
        console.log(`[Proxy] Success! Received ${text.length} characters in ${duration}ms.`);
        
        // Store in cache
        proxyCache.set(targetUrl, { text, timestamp: Date.now() });
        
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.set('Access-Control-Allow-Origin', '*');
        return res.send(text);
      } else {
        const statusText = response.statusText;
        clearTimeout(timeoutId);
        console.warn(`[Proxy] Status ${response.status} (${statusText}) for ${targetUrl.substring(0, 50)}`);
        lastError = new Error(`Status ${response.status}: ${statusText}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      const duration = Date.now() - startTime;
      const msg = err.name === 'AbortError' ? `Timeout (60s)` : (err.message || err);
      console.warn(`[Proxy] Attempt ${i+1} failed after ${duration}ms: ${msg}`);
    }

    if (i < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  res.status(500).send(`Proxy failed: ${lastError?.message}`);
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
  const { title, body, userRole } = req.body;
  
  if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
    console.warn(`Unauthorized broadcast attempt by role: ${userRole}`);
    return res.status(403).json({ success: false, error: "Seuls les administrateurs peuvent diffuser des alertes." });
  }

  console.log("Broadcasting alert:", title);
  
  // Web Push
  sendNotificationToAll(title || "Alerte Stock Critique", body || "Le volume total est inférieur au seuil de sécurité (12 000 poches)");
  
  // WhatsApp
  const config = getWhatsAppConfig();
  const prefix = "[DSDCNTSCI] ";
  const message = `${prefix}🚨 ${title || 'ALERTE'} : ${body || 'Alerte stock critique'}`;
  
  if (config.numbers.length > 0) {
    for (const number of config.numbers) {
      await sendWhatsAppMessage(number, message, config);
    }
  }

  if (config.groupId && config.groupApiUrl) {
    await sendWhatsAppGroupMessage(config.groupId, message, config);
  }

  res.status(200).json({ success: true });
});

app.get("/api/admin/whatsapp-config", (req, res) => {
  const { userRole } = req.query;
  if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
    return res.status(403).json({ error: "Unauthorized" });
  }
  res.json(getWhatsAppConfig());
});

app.post("/api/admin/whatsapp-config", (req, res) => {
  const { userRole, ...config } = req.body;
  if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const current = getWhatsAppConfig();
  saveWhatsAppConfig({ ...current, ...config });
  res.json({ success: true });
});

app.post("/api/admin/whatsapp-test", async (req, res) => {
  const { number, message, userRole } = req.body;
  if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const config = getWhatsAppConfig();
  
  if (!config.apiUrl || (!number && !config.groupId)) {
    return res.status(400).json({ success: false, error: "Configuration incomplète ou numéro manquant." });
  }

  const results: any[] = [];
  const testMsg = message || "Message de test HS";
  const prefix = "[DSDCNTSCI] ";
  const finalMsg = testMsg.startsWith(prefix) ? testMsg : prefix + testMsg;

  try {
    if (number) {
      const cleanNumber = number.replace(/\D/g, '');
      const url = config.apiUrl
        .replace('[NUMBER]', cleanNumber)
        .replace('[MESSAGE]', encodeURIComponent(finalMsg))
        .replace('[APIKEY]', config.apiKey || '');
      
      console.log(`Testing WhatsApp to ${cleanNumber}...`);
      const response = await fetch(url);
      const text = await response.text();
      results.push({ target: cleanNumber, status: response.status, response: text });
    }

    if (config.groupId && config.groupApiUrl) {
      const url = config.groupApiUrl
        .replace('[GROUP]', config.groupId)
        .replace('[MESSAGE]', encodeURIComponent(finalMsg))
        .replace('[APIKEY]', config.apiKey || '');
      
      console.log(`Testing WhatsApp Group to ${config.groupId}...`);
      const response = await fetch(url);
      const text = await response.text();
      results.push({ target: config.groupId, status: response.status, response: text });
    }

    res.json({ success: true, results });
  } catch (err: any) {
    console.error("WhatsApp Test Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/admin/whatsapp-check-now", async (req, res) => {
  const { userRole } = req.body;
  if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
    return res.status(403).json({ error: "Unauthorized" });
  }
  console.log("Forcing data check...");
  await checkDataChanges();
  res.json({ success: true });
});

// Polling logic to check for changes
const COLLECTE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSouyEoRMmp2bAoGgMOtPvN4UfjUetBXnvQBVjPdfcvLfVl2dUNe185DbR2usGyK4UO38p2sb8lBkKN/pub?gid=508129500&single=true&output=csv";
const STOCK_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQvWxbSrjoG4XC2svVnGtLwYDEomCtuwW2Ap_vHKP0M6ONojDQU5LKTJj8Srel5k1d1mD9UI3F5R6r_/pub?gid=2055274680&single=true&output=csv";

let lastCollecteHash = "";
let lastStockHash = "";

async function fetchWithTimeout(url: string, options: any = {}, timeout = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchTextWithRetry(url: string, options: any = {}, maxRetries = 2) {
  let lastError = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (err: any) {
      lastError = err;
      if (i < maxRetries) {
        const delay = 1000 * (i + 1);
        console.warn(`[SERVER] Fetch attempt ${i+1} failed (${err.message}). Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

async function checkDataChanges() {
  try {
    const fetchOptions = {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,application/json,*/*',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };

    console.log("[SERVER] Checking for data changes...");

    // Check Collecte
    try {
      const collecteText = await fetchTextWithRetry(COLLECTE_URL + "&_t=" + Date.now(), fetchOptions);
      if (collecteText.trim() && !collecteText.trim().startsWith("<!DOCTYPE")) {
        if (lastCollecteHash && collecteText !== lastCollecteHash) {
          console.log("[SERVER] Change detected in Collecte!");
          sendNotificationToAll("Nouvelle entrée : Prélèvements mis à jour", "Les données de collecte ont été actualisées.");
        }
        lastCollecteHash = collecteText;
      }
    } catch (err: any) {
      console.warn(`[SERVER] Change check: Failed to fetch Collecte: ${err.message}`);
    }

    // Wait 2 seconds before next fetch
    await new Promise(r => setTimeout(r, 2000));

    // Check Stock
    try {
      const stockText = await fetchTextWithRetry(STOCK_URL + "&_t=" + Date.now(), fetchOptions);
      if (stockText.trim() && !stockText.trim().startsWith("<!DOCTYPE")) {
        // WhatsApp Alert Logic
        const config = getWhatsAppConfig();
        const totalStock = calculateTotalStock(stockText);
        console.log(`[SERVER] Current Total Stock: ${totalStock}`);

        if (totalStock > 0 && totalStock < config.alertThreshold) {
          const now = Date.now();
          // Alert every 4 hours if stock is still low
          if (now - config.lastAlertSent > 4 * 60 * 60 * 1000) {
            console.log("[SERVER] CRITICAL STOCK DETECTED! Sending WhatsApp alerts...");
            const prefix = "[DSDCNTSCI] ";
            const message = `${prefix}🚨 ALERTE STOCK CRITIQUE : Le stock national est à ${totalStock.toLocaleString()} poches. Seuil de sécurité (${config.alertThreshold.toLocaleString()}) non atteint.`;
            
            for (const number of config.numbers) {
              await sendWhatsAppMessage(number, message, config);
            }

            if (config.groupId && config.groupApiUrl) {
              await sendWhatsAppGroupMessage(config.groupId, message, config);
            }
            
            config.lastAlertSent = now;
            saveWhatsAppConfig(config);
          }
        }

        if (lastStockHash && stockText !== lastStockHash) {
          console.log("[SERVER] Change detected in Stock!");
          sendNotificationToAll("Alerte Stock : Changement détecté", "Le niveau des stocks a été mis à jour.");
        }
        lastStockHash = stockText;
      }
    } catch (err: any) {
      console.warn(`[SERVER] Change check: Failed to fetch Stock: ${err.message}`);
    }
  } catch (err) {
    console.error("[SERVER] Fatal error in checkDataChanges loop:", err);
  }
}

function calculateTotalStock(csvText: string): number {
  try {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== "");
    if (lines.length < 2) return 0;
    
    const headers = lines[0].split(/[;,]/).map(h => h.toUpperCase().trim());
    const qtyIdx = headers.findIndex(h => h.includes('QUANTITE') || h.includes('QTE') || h.includes('NB') || h.includes('NOMBRE') || h.includes('STOCK'));
    
    if (qtyIdx === -1) {
      // If no quantity column, count lines (excluding header)
      return lines.length - 1;
    }

    let total = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[;,]/);
      const val = parseFloat(cols[qtyIdx]?.replace(/[^\d,.-]/g, '').replace(',', '.') || "0");
      if (!isNaN(val)) total += val;
    }
    return Math.round(total);
  } catch (err) {
    console.error("Error calculating total stock:", err);
    return 0;
  }
}

async function sendWhatsAppMessage(number: string, message: string, config: any) {
  if (!number || !config.apiUrl) return;
  
  // Clean number (remove +, spaces, etc)
  const cleanNumber = number.replace(/\D/g, '');
  
  console.log(`Sending WhatsApp to ${cleanNumber}: ${message}`);

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
}

async function sendWhatsAppGroupMessage(groupId: string, message: string, config: any) {
  if (!groupId || !config.groupApiUrl) return;
  
  console.log(`Sending WhatsApp Group message to ${groupId}: ${message}`);

  try {
    const url = config.groupApiUrl
      .replace('[GROUP]', groupId)
      .replace('[MESSAGE]', encodeURIComponent(message))
      .replace('[APIKEY]', config.apiKey || '');
    
    await fetch(url);
    console.log(`WhatsApp Group message sent to ${groupId}`);
  } catch (err) {
    console.error(`Failed to send WhatsApp Group message to ${groupId}:`, err);
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
  console.log("[SERVER] startServer() called");
  try {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      console.log("[SERVER] Starting Vite in middleware mode...");
      const viteInstance = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(viteInstance.middlewares);
      console.log("[SERVER] Vite middleware attached");
    } else {
      console.log("[SERVER] Production mode: serving static files");
      const distPath = path.join(process.cwd(), "dist");
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
      } else {
        console.error("[SERVER] dist directory not found!");
      }
    }

    console.log(`[SERVER] Attempting to listen on port ${PORT}...`);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Server successfully running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("[SERVER] Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

export default app;
