import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl = req.method === 'POST' ? req.body.url : req.query.url;
  const targetUrl = Array.isArray(rawUrl) ? (rawUrl[0] as string) : (rawUrl as string);
  
  if (!targetUrl) {
    return res.status(400).send("URL parameter is required");
  }
  
  const maxRetries = 2;
  let lastError = null;

  for (let i = 0; i <= maxRetries; i++) {
    let currentTargetUrl = targetUrl.trim();
    let headers: Record<string, string> = { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    
    // Strategy adjustment based on attempt
    if (i === 1) {
      // Attempt 2: Strip cache-busting
      currentTargetUrl = currentTargetUrl.split('&_t=')[0].split('?_t=')[0];
      console.log(`[Vercel Proxy] Attempt 2: Stripping cache-busting -> ${currentTargetUrl}`);
    } else if (i === 2) {
      // Attempt 3: Strip GID if it's a Google Sheets URL
      if (currentTargetUrl.includes('docs.google.com') && currentTargetUrl.includes('gid=')) {
        currentTargetUrl = currentTargetUrl.replace(/gid=\d+&?/, '').replace(/\?&/, '?').replace(/&$/, '');
        console.log(`[Vercel Proxy] Attempt 3: Stripping GID -> ${currentTargetUrl}`);
      } else {
        // Fallback for non-google URLs: Minimal headers
        headers = { 'User-Agent': 'Mozilla/5.0' };
        console.log(`[Vercel Proxy] Attempt 3: Minimal headers`);
      }
    }

    try {
      console.log(`[Vercel Proxy] Attempt ${i + 1} for ${currentTargetUrl}`);
      
      const response = await fetch(currentTargetUrl, {
        headers,
        timeout: 180000 // 180s timeout
      });
      
      if (response.ok) {
        const text = await response.text();
        const trimmedText = text.trim();
        if (trimmedText.startsWith("<!DOCTYPE") || trimmedText.startsWith("<html")) {
          console.warn(`[Vercel Proxy] Received HTML instead of CSV from ${currentTargetUrl}`);
          lastError = new Error("Le lien Google Sheets renvoie une page HTML au lieu d'un CSV. Vérifiez que le document est bien 'Publié sur le Web' au format CSV et que le GID est correct.");
          continue;
        }
        
        const sizeMB = (text.length / (1024 * 1024)).toFixed(2);
        console.log(`[Vercel Proxy] Success fetching ${currentTargetUrl} (${sizeMB} MB)`);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(text);
      } else {
        const errorBody = await response.text().catch(() => "No error body");
        console.error(`[Vercel Proxy] Error status ${response.status} (${response.statusText}) for ${currentTargetUrl}. Body: ${errorBody.substring(0, 200)}`);
        
        if (response.status === 400) {
          lastError = new Error(`Erreur 400 (Bad Request). Cela indique souvent un GID invalide ou un lien mal formé. Vérifiez votre URL.`);
        } else if (response.status === 401 || response.status === 403) {
          lastError = new Error(`Erreur ${response.status} (Accès refusé). Vérifiez que le document est publié sur le web.`);
        } else {
          lastError = new Error(`Status ${response.status}: ${response.statusText}. Body: ${errorBody.substring(0, 100)}`);
        }
      }
    } catch (err: any) {
      lastError = err;
      console.error(`[Vercel Proxy] Exception on attempt ${i + 1}: ${err.message}`);
    }

    if (i < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  res.status(500).send(`Proxy failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
}
