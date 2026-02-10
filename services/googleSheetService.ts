
import { DashboardData, DailyHistoryRecord, DailyHistorySite, RegionData, SiteRecord, User, UserRole, DistributionRecord, DistributionStats } from "../types.ts";
import { getSiteObjectives, SITES_DATA, WORKING_DAYS_YEAR, getSiteByInput } from "../constants.tsx";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

let lastRawContent = "";

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
    const response = await fetch(`${scriptUrl}?action=getUsers&_t=${Date.now()}`);
    if (!response.ok) throw new Error("Erreur script utilisateurs");
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
      console.error("fetchUsers parse error:", text);
      return [];
    }
  } catch (err) {
    console.error("fetchUsers error:", err);
    return [];
  }
};

export const fetchDynamicSites = async (scriptUrl: string): Promise<any[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getSites&_t=${Date.now()}`);
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
    const response = await fetch(`${scriptUrl}?action=getBranding&_t=${Date.now()}`);
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
    console.error("fetchBrandingConfig error:", err);
    return null;
  }
};

export const fetchDistributions = async (url: string): Promise<{records: DistributionRecord[], stats: DistributionStats} | null> => {
  if (!url || !url.startsWith('http')) return null;
  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`);
    if (!response.ok) return null;
    const text = await response.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return null;

    const records: DistributionRecord[] = [];
    let total = 0;
    let totalRendu = 0;
    
    rows.slice(1).forEach(row => {
      if (row.length < 10 || row[1].toLowerCase().includes('date')) return;

      const date = normalizeDate(row[1]);
      const siCode = cleanStr(row[0]);
      const qty = cleanNum(row[3]);
      const product = cleanStr(row[5]);
      const group = cleanStr(row[6]);
      const facility = cleanStr(row[8]);
      const rendu = cleanNum(row[9]);
      
      if (date && (qty > 0 || rendu > 0)) {
        let searchCode = siCode;
        const codeNum = parseInt(siCode);
        if (!isNaN(codeNum) && siCode.length <= 2) {
          searchCode = (codeNum * 1000).toString();
        }
        
        const siteInfo = getSiteByInput(searchCode) || getSiteByInput(cleanStr(row[2]));
        
        total += qty;
        totalRendu += rendu;
        
        records.push({
          date,
          codeSite: siCode,
          site: siteInfo?.name || cleanStr(row[2]) || "SITE INCONNU",
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
    console.error("fetchDistributions failure:", e);
    return null;
  }
};

export const fetchSheetData = async (url: string, force = false, distributionUrl?: string, dynamicSites: any[] = []): Promise<DashboardData | null> => {
  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`);
    if (!response.ok) throw new Error(`Source inaccessible (Code ${response.status})`);
    const text = await response.text();
    if (!force && text === lastRawContent) return null;
    lastRawContent = text;

    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("Fichier source vide ou mal formaté.");

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

      const siteInfo = getSiteByInput(code) || getSiteByInput(siteName);
      const dynSite = dynamicSites.find(ds => ds.code === code || ds.name === siteName);
      
      const objs = getSiteObjectives(siteName);

      if (y === targetYear && (m - 1) === targetMonth) {
        const key = siteName.toUpperCase();
        const existing = siteAgg.get(key) || { f: 0, m: 0, t: 0, mf: 0, mm: 0 };
        siteAgg.set(key, {
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
      dayRec.sites.push({
        name: siteName,
        fixe,
        mobile,
        total,
        objective: objs.daily,
        region: siteInfo?.region,
        manager: dynSite?.manager || siteInfo?.manager,
        email: dynSite?.email || siteInfo?.email,
        phone: dynSite?.phone || siteInfo?.phone
      });
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

    const distributions = distributionUrl ? await fetchDistributions(distributionUrl) : undefined;

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
      distributions: distributions || undefined
    };
  } catch (err) {
    console.error("fetchSheetData error:", err);
    return null;
  }
};

export const saveRecordToSheet = async (scriptUrl: string, payload: any): Promise<void> => {
  if (!scriptUrl) throw new Error("URL du script manquante");
  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-cache',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};
