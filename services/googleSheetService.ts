
import { DashboardData, DailyHistoryRecord, DailyHistorySite, RegionData, SiteRecord, User, UserRole, DistributionRecord, DistributionStats, ActivityLog, StockRecord } from "../types.ts";
import { getSiteObjectives, SITES_DATA, WORKING_DAYS_YEAR, getSiteByInput } from "../constants.tsx";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

let lastRawContent: Record<string, string> = {};

const cleanStr = (s: any): string => {
  if (s === null || s === undefined) return "";
  const str = s.toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const upper = str.toUpperCase();
  if (upper === "#N/A" || upper === "N/A" || upper === "#REF!" || upper === "#VALEUR!" || upper === "#VALUE!") return "";
  return str;
};

const normalizeDate = (d: string): string => {
  const s = cleanStr(d);
  if (!s) return "";
  if (s.includes('-') && s.length >= 10) {
    const parts = s.split('-');
    if (parts.length >= 3) return `${parts[2].substring(0,2).padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  const parts = s.split('/');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = "20" + year;
    return `${day}/${month}/${year}`;
  }
  return s;
};

const parseCSV = (text: string): string[][] => {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];
  
  const firstLine = lines[0] || "";
  const sep = firstLine.includes(';') ? ';' : ',';
  
  return lines.map(line => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === sep && !inQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  });
};

const cleanNum = (val: any): number => {
  if (!val) return 0;
  const s = cleanStr(val).replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
};

export const fetchUsers = async (scriptUrl: string): Promise<User[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getUsers&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });
    if (!response.ok) return [];
    const text = await response.text();
    try {
      const users = JSON.parse(text);
      return users.map((u: any) => ({
        nom: cleanStr(u.nom),
        prenoms: cleanStr(u.prenoms),
        email: cleanStr(u.email),
        fonction: cleanStr(u.fonction),
        site: cleanStr(u.site),
        role: (cleanStr(u.role) as UserRole) || 'AGENT',
        region: cleanStr(u.region)
      }));
    } catch (e) {
      return [];
    }
  } catch (err) {
    return [];
  }
};

export const fetchLogs = async (scriptUrl: string): Promise<ActivityLog[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getLogs&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors'
    });
    if (!response.ok) return [];
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return [];
    }
  } catch (err) {
    return [];
  }
};

export const fetchDynamicSites = async (scriptUrl: string): Promise<any[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getSites&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors'
    });
    if (!response.ok) return [];
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return [];
    }
  } catch (err) {
    return [];
  }
};

export const fetchBrandingConfig = async (scriptUrl: string): Promise<{logo: string, hashtag: string} | null> => {
  if (!scriptUrl) return null;
  try {
    const response = await fetch(`${scriptUrl}?action=getBranding&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors'
    });
    if (!response.ok) return null;
    const text = await response.text();
    
    if (text.startsWith("Action inconnue") || text.startsWith("<!DOCTYPE")) {
        return null;
    }

    try {
      const config = JSON.parse(text);
      return {
        logo: config.logo || './assets/logo.png',
        hashtag: config.hashtag || '#DONSANG_CI'
      };
    } catch (e) {
      return null;
    }
  } catch (err) {
    return null;
  }
};

export const parseDistributions = (text: string): {records: DistributionRecord[], stats: DistributionStats} | null => {
  try {
    const rows = parseCSV(text);
    if (rows.length < 2) return null;

    const headers = rows[0].map(h => cleanStr(h).toUpperCase());
    const idxCode = headers.findIndex(h => h.includes('CODE') || h.includes('ID'));
    const idxDate = headers.findIndex(h => h.includes('DATE'));
    const idxSite = headers.findIndex(h => h.includes('SITE') || h.includes('STRUCTURE'));
    const idxQty = headers.findIndex(h => h.includes('QUANTITE') || h.includes('QTE') || h.includes('NB') || h.includes('NOMBRE'));
    const idxProd = headers.findIndex(h => h.includes('PRODUIT') || h.includes('TYPE') || h.includes('PSL'));
    const idxGroup = headers.findIndex(h => h.includes('GROUPE') || h.includes('SANGUIN') || h.includes('GS'));
    const idxFacility = headers.findIndex(h => h.includes('ETABLISSEMENT') || h.includes('DESTINATION') || h.includes('CLIENT'));
    const idxRendu = headers.findIndex(h => h.includes('RENDU') || h.includes('PERIME') || h.includes('RETOUR'));

    const records: DistributionRecord[] = [];
    let total = 0;
    let totalRendu = 0;
    
    rows.slice(1).forEach(row => {
      const dateStr = cleanStr(row[idxDate >= 0 ? idxDate : 1]);
      if (!dateStr || dateStr.toLowerCase().includes('date')) return;

      const date = normalizeDate(dateStr);
      const siCode = cleanStr(row[idxCode >= 0 ? idxCode : 0]);
      const qty = cleanNum(row[idxQty >= 0 ? idxQty : 3]);
      const product = cleanStr(row[idxProd >= 0 ? idxProd : 5]);
      const group = cleanStr(row[idxGroup >= 0 ? idxGroup : 6]);
      const facility = cleanStr(row[idxFacility >= 0 ? idxFacility : 8]);
      const rendu = cleanNum(row[idxRendu >= 0 ? idxRendu : 9]);
      
      if (date && (qty > 0 || rendu > 0)) {
        let searchCode = siCode;
        const codeNum = parseInt(siCode);
        if (!isNaN(codeNum) && siCode.length <= 2) {
          searchCode = (codeNum * 1000).toString();
        }
        
        const siteInfo = getSiteByInput(searchCode) || getSiteByInput(cleanStr(row[idxSite >= 0 ? idxSite : 2]));
        
        total += qty;
        totalRendu += rendu;
        
        records.push({
          date,
          codeSite: siCode,
          site: siteInfo?.name || cleanStr(row[idxSite >= 0 ? idxSite : 2]) || "SITE INCONNU",
          region: siteInfo?.region || "AUTRES",
          etablissement: facility || "ÉTABLISSEMENT INCONNU",
          typeProduit: product || "AUTRES",
          groupeSanguin: group || "N/A",
          quantite: qty,
          rendu: rendu
        });
      }
    });

    records.sort((a, b) => {
        const [da, ma, ya] = a.date.split('/').map(Number);
        const [db, mb, yb] = b.date.split('/').map(Number);
        return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });

    return {
      records,
      stats: {
        total,
        totalRendu,
        average: records.length > 0 ? (total - totalRendu) / records.length : 0,
        lastUpdate: records[0]?.date || "---"
      }
    };
  } catch (e) {
    return null;
  }
};

export const fetchDistributions = async (url: string): Promise<{records: DistributionRecord[], stats: DistributionStats} | null> => {
  if (!url || !url.startsWith('http')) return null;
  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`);
    if (!response.ok) return null;
    const text = await response.text();
    return parseDistributions(text);
  } catch (e) {
    return null;
  }
};

export const parseStock = (text: string): StockRecord[] | null => {
  try {
    const rows = parseCSV(text);
    if (rows.length < 2) return null;

    const headers = rows[0].map(h => cleanStr(h).toUpperCase());
    const idxPres = headers.findIndex(h => h.includes('PRES') || h.includes('POLE') || h.includes('COORDINATION'));
    const idxSite = headers.findIndex(h => h.includes('SITE') || h.includes('STRUCTURE') || h.includes('ETABLISSEMENT') || h.includes('POINT'));
    const idxProd = headers.findIndex(h => h.includes('PRODUIT') || h.includes('TYPE') || h.includes('PSL'));
    const idxGroup = headers.findIndex(h => h.includes('GROUPE') || h.includes('SANGUIN') || h.includes('GS'));
    const idxQty = headers.findIndex(h => h.includes('QUANTITE') || h.includes('STOCK') || h.includes('QTE') || h.includes('NB') || h.includes('NOMBRE'));

    // Si on ne trouve pas les colonnes essentielles, on considère que ce n'est pas un fichier de stock
    if (idxSite === -1 || idxProd === -1 || idxGroup === -1 || idxQty === -1) {
      return null;
    }

    const records: StockRecord[] = [];
    rows.slice(1).forEach(row => {
      const pres = cleanStr(row[idxPres >= 0 ? idxPres : 0]);
      const site = cleanStr(row[idxSite]);
      const typeProduit = cleanStr(row[idxProd]);
      const groupeSanguin = cleanStr(row[idxGroup]);
      const quantite = cleanNum(row[idxQty]);

      if (site && typeProduit && groupeSanguin && !site.toLowerCase().includes('site')) {
        records.push({ pres, site, typeProduit, groupeSanguin, quantite });
      }
    });
    return records;
  } catch (e) {
    return null;
  }
};

export const fetchStock = async (url: string): Promise<StockRecord[] | null> => {
  if (!url || !url.startsWith('http')) return null;
  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`);
    if (!response.ok) return null;
    const text = await response.text();
    return parseStock(text);
  } catch (e) {
    return null;
  }
};

export const fetchSheetData = async (url: string, force = false, distributionUrl?: string, dynamicSites: any[] = [], stockUrl?: string): Promise<DashboardData | null> => {
  try {
    const fetchWithRetry = async (targetUrl: string, key: string, retries = 2): Promise<{ text: string, hasChanged: boolean, error: boolean }> => {
      if (!targetUrl || !targetUrl.startsWith('http')) {
        return { text: lastRawContent[key] || '', hasChanged: false, error: true };
      }
      
      for (let i = 0; i <= retries; i++) {
        try {
          // Utilisation d'un fetch plus simple pour éviter les problèmes de CORS/Preflight
          // Les headers Cache-Control peuvent parfois bloquer sur certains serveurs Google si non configurés
          const response = await fetch(targetUrl, { 
            method: 'GET',
            mode: 'cors',
            cache: 'no-store'
          });
          
          if (!response.ok) {
            console.warn(`Source ${key} inaccessible (Code ${response.status}) - Tentative ${i + 1}/${retries + 1}`);
            if (i === retries) return { text: lastRawContent[key] || '', hasChanged: false, error: true };
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
            continue;
          }
          const text = await response.text();
          const hasChanged = force || text !== lastRawContent[key];
          lastRawContent[key] = text;
          return { text, hasChanged, error: false };
        } catch (e) {
          console.error(`Erreur lors du fetch de ${key} (Tentative ${i + 1}/${retries + 1}):`, e);
          if (i === retries) return { text: lastRawContent[key] || '', hasChanged: false, error: true };
          await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
        }
      }
      return { text: lastRawContent[key] || '', hasChanged: false, error: true };
    };

    const [collecteResult, distResult, stockResult] = await Promise.all([
      fetchWithRetry(url, 'collecte'),
      distributionUrl ? fetchWithRetry(distributionUrl, 'distribution') : Promise.resolve({ text: '', hasChanged: false, error: false }),
      stockUrl ? fetchWithRetry(stockUrl, 'stock') : Promise.resolve({ text: '', hasChanged: false, error: false })
    ]);

    // Si la collecte échoue et qu'on n'a rien en cache, on ne peut rien faire
    if (collecteResult.error && !collecteResult.text) {
      throw new Error("Impossible de charger la source principale (Collecte)");
    }

    if (!force && !collecteResult.hasChanged && !distResult.hasChanged && !stockResult.hasChanged) {
      return null;
    }

    const rows = parseCSV(collecteResult.text);
    if (rows.length < 2) {
      if (collecteResult.text.includes("<!DOCTYPE")) {
        throw new Error("La source Collecte semble être une page HTML (vérifiez que le lien est bien un export CSV)");
      }
      throw new Error("Fichier source Collecte vide ou mal formaté.");
    }

    const col = { date: 0, code: 1, site: 2, fixe: 5, mobile: 7, total: 8 };
    let latestDateObj = new Date(2000, 0, 1);
    const validRows: any[] = [];

    rows.slice(1).forEach(row => {
      const dateStr = normalizeDate(row[col.date]);
      if (!dateStr) return;
      const [d, m, y] = dateStr.split('/').map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) {
        if (dateObj > latestDateObj) latestDateObj = dateObj;
        validRows.push({ row, dateObj, dateStr });
      }
    });

    if (validRows.length === 0) throw new Error("Aucune donnée de date valide trouvée.");

    const targetMonth = latestDateObj.getMonth();
    const targetYear = latestDateObj.getFullYear();
    const latestDateStr = `${latestDateObj.getDate().toString().padStart(2, '0')}/${(latestDateObj.getMonth() + 1).toString().padStart(2, '0')}/${latestDateObj.getFullYear()}`;

    const historyMap = new Map<string, DailyHistoryRecord>();
    const siteAgg = new Map<string, { f: number, m: number, t: number, mf: number, mm: number }>();

    validRows.forEach(({ row, dateStr }) => {
      const parts = dateStr.split('/');
      const [d, m, y] = parts.map(Number);
      const code = cleanStr(row[col.code]);
      const siteName = cleanStr(row[col.site]);
      const fixe = cleanNum(row[col.fixe]);
      const mobile = cleanNum(row[col.mobile]);
      const total = cleanNum(row[col.total]);

      // CRITICAL: On identifie le site "officiel" via son code ou son nom approximatif
      const siteInfo = getSiteByInput(code) || getSiteByInput(siteName);
      const canonicalName = siteInfo ? siteInfo.name.toUpperCase() : siteName.toUpperCase();
      
      const dynSite = dynamicSites.find(ds => ds.code === code || ds.name === siteName);
      const objs = getSiteObjectives(canonicalName);

      if (y === targetYear && (m - 1) === targetMonth) {
        const existing = siteAgg.get(canonicalName) || { f: 0, m: 0, t: 0, mf: 0, mm: 0 };
        siteAgg.set(canonicalName, {
          f: dateStr === latestDateStr ? fixe : existing.f,
          m: dateStr === latestDateStr ? mobile : existing.m,
          t: existing.t + total,
          mf: existing.mf + fixe,
          mm: existing.mm + mobile
        });
      }

      if (!historyMap.has(dateStr)) {
        historyMap.set(dateStr, {
          date: dateStr,
          stats: { realized: 0, fixed: 0, mobile: 0 },
          sites: []
        });
      }
      const dayRec = historyMap.get(dateStr)!;
      dayRec.stats.realized += total;
      dayRec.stats.fixed += fixe;
      dayRec.stats.mobile += mobile;
      
      // On regroupe aussi au sein de dailyHistory par nom canonique pour éviter les doublons
      let existingSiteEntry = dayRec.sites.find(s => s.name.toUpperCase() === canonicalName);
      if (existingSiteEntry) {
        existingSiteEntry.fixe += fixe;
        existingSiteEntry.mobile += mobile;
        existingSiteEntry.total += total;
      } else {
        dayRec.sites.push({
          name: siteInfo?.name || siteName,
          fixe,
          mobile,
          total,
          objective: objs.daily,
          region: siteInfo?.region,
          manager: dynSite?.manager || siteInfo?.manager,
          email: dynSite?.email || siteInfo?.email,
          phone: dynSite?.phone || siteInfo?.phone
        });
      }
    });

    const dailyHistory = Array.from(historyMap.values()).sort((a, b) => {
      const [da, ma, ya] = a.date.split('/').map(Number);
      const [db, mb, yb] = b.date.split('/').map(Number);
      return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });

    const regionsMap = new Map<string, RegionData>();
    SITES_DATA.forEach(s => {
      const regName = s.region || "AUTRES";
      if (!regionsMap.has(regName)) {
        regionsMap.set(regName, { name: regName, sites: [] });
      }
      const agg = siteAgg.get(s.name.toUpperCase());
      const dynS = dynamicSites.find(ds => ds.code === s.code);

      const siteRec: SiteRecord = {
        name: s.name,
        region: s.region,
        fixe: agg?.f || 0,
        mobile: agg?.m || 0,
        totalJour: (agg?.f || 0) + (agg?.m || 0),
        totalMois: agg?.t || 0,
        monthlyFixed: agg?.mf || 0,
        monthlyMobile: agg?.mm || 0,
        objDate: getSiteObjectives(s.name).daily,
        objMensuel: getSiteObjectives(s.name).monthly,
        manager: dynS?.manager || s.manager,
        email: dynS?.email || s.email,
        phone: dynS?.phone || s.phone
      };
      regionsMap.get(regName)!.sites.push(siteRec);
    });

    const regions = Array.from(regionsMap.values());
    const mRealized = regions.reduce((acc, r) => acc + r.sites.reduce((sa, s) => sa + s.totalMois, 0), 0);
    const mObjective = regions.reduce((acc, r) => acc + r.sites.reduce((sa, s) => sa + s.objMensuel, 0), 0);
    const aObjective = SITES_DATA.reduce((acc, s) => acc + s.annualObjective, 0);

    const distributions = distResult.text ? parseDistributions(distResult.text) : undefined;
    const stock = stockResult.text ? parseStock(stockResult.text) : undefined;

    return {
      date: latestDateStr,
      month: MONTHS_FR[targetMonth],
      year: targetYear,
      daily: dailyHistory[0] ? {
        realized: dailyHistory[0].stats.realized,
        fixed: dailyHistory[0].stats.fixed,
        mobile: dailyHistory[0].stats.mobile,
        objective: regions.reduce((acc, r) => acc + r.sites.reduce((sa, s) => sa + s.objDate, 0), 0),
        percentage: (dailyHistory[0].stats.realized / (regions.reduce((acc, r) => acc + r.sites.reduce((sa, s) => sa + s.objDate, 0), 0) || 1)) * 100
      } : { realized: 0, objective: 0, percentage: 0, fixed: 0, mobile: 0 },
      monthly: {
        realized: mRealized,
        objective: mObjective,
        percentage: mObjective > 0 ? (mRealized / mObjective) * 100 : 0,
        fixed: regions.reduce((acc, r) => acc + r.sites.reduce((sa, s) => sa + (s.monthlyFixed || 0), 0), 0),
        mobile: regions.reduce((acc, r) => acc + r.sites.reduce((sa, s) => sa + (s.monthlyMobile || 0), 0), 0)
      },
      annual: {
        realized: mRealized,
        objective: aObjective,
        percentage: aObjective > 0 ? (mRealized / aObjective) * 100 : 0,
        fixed: 0,
        mobile: 0
      },
      dailyHistory,
      regions,
      distributions: distributions || undefined,
      stock: stock || undefined
    };
  } catch (err) {
    return null;
  }
};

/**
 * Sauvegarde un enregistrement vers le Google Sheet via le script GAS.
 * On utilise mode: 'no-cors' et Content-Type: 'text/plain' pour transformer 
 * la requête en "Simple Request", ce qui évite les erreurs CORS Preflight 
 * avec les services Google Script.
 */
export const saveRecordToSheet = async (scriptUrl: string, payload: any): Promise<void> => {
  if (!scriptUrl) throw new Error("URL du script manquante");
  
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Empêche le preflight OPTIONS qui échoue souvent sur GAS
      cache: 'no-cache',
      headers: { 
        'Content-Type': 'text/plain' // Simple Request : pas de preflight requis
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Erreur persistante lors de la sauvegarde Sheet:", err);
    throw err;
  }
};
