import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl = req.query.url;
  const targetUrl = Array.isArray(rawUrl) ? (rawUrl[0] as string) : (rawUrl as string);
  
  if (!targetUrl) {
    return res.status(400).send("URL parameter is required");
  }
  
  const maxRetries = 2;
  let lastError = null;

  for (let i = 0; i <= maxRetries; i++) {
    let currentTargetUrl = targetUrl;
    
    // On the second and subsequent retries, try stripping cache-busting if we got a 400
    if (i > 0 && lastError?.message?.includes("Status 400")) {
      currentTargetUrl = targetUrl.split('&_t=')[0].split('?_t=')[0];
      console.log(`[Vercel Proxy] Retrying without cache-busting: ${currentTargetUrl.substring(0, 100)}...`);
    }

    try {
      console.log(`[Vercel Proxy] Attempt ${i + 1} for ${currentTargetUrl.substring(0, 100)}...`);
      
      const response = await fetch(currentTargetUrl, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 180000 // 180s timeout
      });
      
      if (response.ok) {
        const text = await response.text();
        if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
          console.warn(`[Vercel Proxy] Received HTML instead of CSV from ${currentTargetUrl.substring(0, 60)}...`);
          lastError = new Error("Received HTML instead of CSV (Google might be asking for login or blocking)");
          continue;
        }
        
        const sizeMB = (text.length / (1024 * 1024)).toFixed(2);
        console.log(`[Vercel Proxy] Success fetching ${currentTargetUrl.substring(0, 60)}... (${sizeMB} MB)`);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(text);
      } else {
        console.error(`[Vercel Proxy] Error status ${response.status} (${response.statusText}) for ${currentTargetUrl.substring(0, 100)}`);
        lastError = new Error(`Status ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      lastError = err;
      console.error(`[Vercel Proxy] Exception on attempt ${i + 1}: ${err.message}`);
    }

    if (i < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  res.status(500).send(`Proxy failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
}

