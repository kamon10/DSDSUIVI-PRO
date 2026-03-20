import express from "express";
import * as vite from "vite";
import webpush from "web-push";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import sql from "mssql";

// Database connection pool
const isDbConfigured = !!(process.env.DATABASE_URL || process.env.SQL_SERVER);
let pool: sql.ConnectionPool | null = null;

// Handle connection string conversion
let connectionString = process.env.DATABASE_URL || "";

// If separate variables are provided, build the connection string
if (!connectionString && process.env.SQL_SERVER) {
  const user = process.env.SQL_USER || "";
  const password = process.env.SQL_PASSWORD || "";
  const server = process.env.SQL_SERVER;
  const database = process.env.SQL_DATABASE || "";
  const port = process.env.SQL_PORT || "1433";
  
  // Build a standard mssql connection string
  if (user && password) {
    connectionString = `mssql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${server}:${port}/${database}`;
  } else {
    connectionString = `mssql://${server}:${port}/${database}`;
  }
}

// Normalize prefixes
if (connectionString.startsWith("postgres://")) {
  connectionString = connectionString.replace("postgres://", "mssql://");
}
if (connectionString.startsWith("sqlserver://")) {
  connectionString = connectionString.replace("sqlserver://", "mssql://");
}

// SQL Server configuration
let sqlConfig: any = {
  options: {
    encrypt: true,
    trustServerCertificate: true,
    connectTimeout: 30000, // 30 seconds
    requestTimeout: 30000
  }
};

if (connectionString.startsWith("mssql://")) {
  if (connectionString.includes(";")) {
    let raw = connectionString.replace("mssql://", "");
    raw = raw.replace(/user=/gi, "User Id=");
    raw = raw.replace(/password=/gi, "Password=");
    
    if (!raw.toLowerCase().startsWith("server=")) {
      const parts = raw.split(";");
      const hostPort = parts[0].replace(":", ",");
      const rest = parts.slice(1).join(";");
      raw = `Server=${hostPort};${rest}`;
    }
    
    if (!raw.toLowerCase().includes("trustservercertificate")) raw += ";TrustServerCertificate=true";
    if (!raw.toLowerCase().includes("encrypt")) raw += ";Encrypt=true";
    if (!raw.toLowerCase().includes("connection timeout")) raw += ";Connection Timeout=30";
    
    sqlConfig = raw;
  } else {
    // Ensure basic options are present in the URL
    if (!connectionString.includes("trustServerCertificate")) {
      connectionString += (connectionString.includes("?") ? "&" : "?") + "trustServerCertificate=true";
    }
    if (!connectionString.includes("encrypt")) connectionString += "&encrypt=true";
    if (!connectionString.includes("connectTimeout")) connectionString += "&connectTimeout=30000";
    sqlConfig = connectionString;
  }
} else if (connectionString.includes(";")) {
  sqlConfig = connectionString;
  sqlConfig = sqlConfig.replace(/user=/gi, "User Id=");
  sqlConfig = sqlConfig.replace(/password=/gi, "Password=");
  if (!sqlConfig.toLowerCase().includes("trustservercertificate")) sqlConfig += ";TrustServerCertificate=true";
  if (!sqlConfig.toLowerCase().includes("encrypt")) sqlConfig += ";Encrypt=true";
  if (!sqlConfig.toLowerCase().includes("connection timeout")) sqlConfig += ";Connection Timeout=30";
} else if (connectionString) {
  sqlConfig.connectionString = connectionString;
}

// Function to get or create connection pool
async function getPool() {
  if (pool && pool.connected) return pool;
  
  if (!isDbConfigured) {
    throw new Error("DATABASE_URL non configurée. Veuillez ajouter le secret DATABASE_URL.");
  }

  console.log("[DB] Tentative de connexion à SQL Server...");
  try {
    pool = await new sql.ConnectionPool(sqlConfig).connect();
    console.log("[DB] Connexion SQL Server réussie");
    return pool;
  } catch (err: any) {
    console.error("[DB] Erreur de connexion détaillée:", err);
    
    let userMessage = err.message;
    const host = connectionString.match(/@([^;/?#]+)/)?.[1] || 'votre serveur';
    
    if (err.message.includes("ETIMEDOUT") || err.message.toLowerCase().includes("timeout") || err.message.includes("Failed to connect")) {
      userMessage = `Impossible d'atteindre le serveur SQL à ${host}. `;
      
      if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.') || host.startsWith('192.0.') || host === 'localhost' || host === '127.0.0.1') {
        userMessage += `L'adresse IP ${host} semble être une adresse locale ou privée. L'application étant hébergée dans le cloud, elle ne peut pas accéder directement à votre réseau local. Veuillez utiliser une IP publique ou un tunnel (ex: ngrok).`;
      } else {
        userMessage += "Vérifiez que l'IP est publique, que le serveur est allumé et que le port 1433 est ouvert dans votre pare-feu.";
      }
    } else if (err.message.includes("Login failed")) {
      userMessage = "Échec de l'authentification SQL. Vérifiez l'utilisateur et le mot de passe dans DATABASE_URL.";
    }
    
    pool = null;
    throw new Error(userMessage);
  }
}

// Initialize connection on startup
if (isDbConfigured) {
  getPool().catch(() => {
    console.error("[DB] Initial connection failed. Will retry on first request.");
  });
} else {
  console.warn("[DB] DATABASE_URL not set. SQL features will be disabled.");
}

console.log("[SERVER] Starting initialization...");

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
});

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
const PORT = 3000;

// VAPID keys should be generated and stored securely
let publicVapidKey = process.env.VAPID_PUBLIC_KEY || "BDdrj94n3PTusNcd5JIO5APbc24j2rA5P8tsi9We65lNl-c8hB9GU_jwRTs30nGtjRkQ23fjYojzZRxT34kzd3o";
let privateVapidKey = process.env.VAPID_PRIVATE_KEY || "OcHvsUQtCRgDyfMEb1qeEHdw9DPv9OtFNS4otB4j5wc";

const vapidEmail = process.env.VAPID_EMAIL || "mailto:kadioamon@gmail.com";
const vapidSubject = (vapidEmail.startsWith('mailto:') || vapidEmail.startsWith('http')) 
  ? vapidEmail 
  : `mailto:${vapidEmail}`;

function setupVapid() {
  try {
    console.log("[SERVER] Setting up VAPID details...");
    webpush.setVapidDetails(
      vapidSubject,
      publicVapidKey,
      privateVapidKey
    );
    console.log("[SERVER] VAPID details set successfully");
  } catch (err) {
    console.error("[SERVER] Failed to set VAPID details with provided keys, generating new ones...", err);
    try {
      const keys = webpush.generateVAPIDKeys();
      publicVapidKey = keys.publicKey;
      privateVapidKey = keys.privateKey;
      webpush.setVapidDetails(
        vapidSubject,
        publicVapidKey,
        privateVapidKey
      );
      console.log("[SERVER] VAPID details set successfully with generated keys");
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

// SQL API Routes
app.get("/api/sql/prelevements", async (req, res) => {
  try {
    const pool = await getPool();
    // Note: User should provide the correct table name if it's not 'prelevements'
    const result = await pool.query('SELECT TOP 100 * FROM prelevements ORDER BY date_collecte DESC');
    res.json(result.recordset);
  } catch (err: any) {
    console.error("[DB] Error fetching prelevements:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sql/stocks", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query('SELECT TOP 100 * FROM dbo.T_STOCKS');
    res.json(result.recordset);
  } catch (err: any) {
    console.error("[DB] Error fetching stocks:", err);
    let message = err.message;
    if (message.includes("Invalid object name 'dbo.T_STOCKS'")) {
      message = "La table 'dbo.T_STOCKS' n'existe pas. Veuillez vérifier le nom exact.";
    }
    res.status(500).json({ error: message });
  }
});

// Diagnostic endpoint to help user find table names and columns
app.get("/api/sql/diagnostics", async (req, res) => {
  try {
    const pool = await getPool();
    const tablesResult = await pool.query(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    
    // Also get columns for T_STOCKS if it exists
    const columnsResult = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'T_STOCKS'
    `);
    
    res.json({ 
      tables: tablesResult.recordset,
      columns: columnsResult.recordset
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
      console.error(`[Proxy] Error fetching ${targetUrl}: ${response.status} ${response.statusText}`);
      return res.status(response.status).send(`Proxy error: ${response.statusText}`);
    }
    const text = await response.text();
    console.log(`[Proxy] Success fetching ${targetUrl.substring(0, 100)}... (${text.length} bytes)`);
    if (text.includes("<!DOCTYPE")) {
      console.warn(`[Proxy] Warning: Received HTML instead of CSV from ${targetUrl.substring(0, 100)}...`);
    }
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
      
      // WhatsApp Alert Logic
      const config = getWhatsAppConfig();
      const totalStock = calculateTotalStock(text);
      console.log(`Current Total Stock: ${totalStock}`);

      if (totalStock < config.alertThreshold) {
        const now = Date.now();
        // Alert every 4 hours if stock is still low
        if (now - config.lastAlertSent > 4 * 60 * 60 * 1000) {
          console.log("CRITICAL STOCK DETECTED! Sending WhatsApp alerts...");
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
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[SERVER] Starting Vite in middleware mode...");
    const viteInstance = await vite.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(viteInstance.middlewares);
    console.log("[SERVER] Vite middleware attached");
  } else {
    console.log("[SERVER] Production mode: serving static files");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

    console.log(`[SERVER] Attempting to listen on port ${PORT}...`);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Server successfully running on http://0.0.0.0:${PORT}`);
    });
}

startServer();
