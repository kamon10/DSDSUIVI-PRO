
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
    const users = await response.json();
    return users.map((u: any) => ({
      nom: cleanStr(u.nom),
      prenoms: cleanStr(u.prenoms),
      email: cleanStr(u.email),
      fonction: cleanStr(u.fonction),
      site: cleanStr(u.site),
      role: (cleanStr(u.role) as UserRole) || 'AGENT',
      region: cleanStr(u.region)
    }));
  } catch (err) {
    console.error("fetchUsers error:", err);
    return [];
  }
};

/**
 * Récupère la configuration globale (Logo, Hashtag) depuis le Sheet central
 */
export const fetchBrandingConfig = async (scriptUrl: string): Promise<{logo: string, hashtag: string} | null> => {
  if (!scriptUrl) return null;
  try {
    const response = await fetch(`${scriptUrl}?action=getBranding&_t=${Date.now()}`);
    if (!response.ok) return null;
    const config = await response.json();
    return {
      logo: config.logo || './assets/logo.png',
      hashtag: config.hashtag || '#DONSANG_CI'
    };
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

export const fetchSheetData = async (url: string, force = false, distributionUrl?: string): Promise<DashboardData | null> => {
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
    const siteAgg = new Map<string, { f: number, m: number, t: number, lastT: number, lastF: number, lastM: number }>();

    validRows.forEach(({ row, dateObj, dateStr }) => {
      const codeRaw = cleanStr(row[col.code]);
      const siteRaw = cleanStr(row[col.site]);
      const siteInfo = getSiteByInput(codeRaw) || getSiteByInput(siteRaw);
      if (!siteInfo) return;

      const finalSiteName = siteInfo.name;
      const finalRegion = siteInfo.region;
      const f = cleanNum(row[col.fixe]);
      const m = cleanNum(row[col.mobile]);
      const t = cleanNum(row[col.total]) || (f + m);

      if (!siteAgg.has(finalSiteName)) {
        siteAgg.set(finalSiteName, { f: 0, m: 0, t: 0, lastT: 0, lastF: 0, lastM: 0 });
      }
      const agg = siteAgg.get(finalSiteName)!;
      if (dateObj.getFullYear() === targetYear && dateObj.getMonth() === targetMonth) {
        agg.f += f; agg.m += m; agg.t += t;
      }
      if (dateStr === latestDateStr) {
        agg.lastT = t; agg.lastF = f; agg.lastM = m;
      }

      if (!historyMap.has(dateStr)) {
        historyMap.set(dateStr, { date: dateStr, stats: { realized: 0, fixed: 0, mobile: 0 }, sites: [] });
      }
      const day = historyMap.get(dateStr)!;
      day.stats.realized += t;
      day.stats.fixed += f;
      day.stats.mobile += m;
      
      const siteObjs = getSiteObjectives(finalSiteName);
      day.sites.push({ 
        name: finalSiteName, fixe: f, mobile: m, total: t,
        objective: siteObjs.daily, region: finalRegion,
        manager: siteInfo?.manager, email: siteInfo?.email, phone: siteInfo?.phone
      });
    });

    const history = Array.from(historyMap.values()).sort((a, b) => {
      const [da, ma, ya] = a.date.split('/').map(Number);
      const [db, mb, yb] = b.date.split('/').map(Number);
      return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });

    const regionsMap = new Map<string, RegionData>();
    siteAgg.forEach((stats, name) => {
      const siteInfo = getSiteByInput(name);
      if (!siteInfo) return;
      const regName = siteInfo.region;
      if (!regionsMap.has(regName)) regionsMap.set(regName, { name: regName, sites: [] });
      const siteObjs = getSiteObjectives(name);
      regionsMap.get(regName)!.sites.push({
        name, region: regName, fixe: stats.lastF, mobile: stats.lastM,
        totalJour: stats.lastT, totalMois: stats.t, monthlyFixed: stats.f, monthlyMobile: stats.m,
        objDate: 0, objMensuel: siteObjs.monthly,
        manager: siteInfo?.manager, email: siteInfo?.email, phone: siteInfo?.phone
      });
    });

    const regionsList = Array.from(regionsMap.values()).sort((a,b) => a.name.localeCompare(b.name));

    let monthlyRealized = 0;
    let monthlyFixed = 0;
    let monthlyMobile = 0;
    regionsList.forEach(reg => {
      reg.sites.forEach(site => {
        monthlyRealized += site.totalMois;
        monthlyFixed += (site.monthlyFixed || 0);
        monthlyMobile += (site.monthlyMobile || 0);
      });
    });

    const annualRealized = history
      .filter(h => h.date.split('/')[2] === targetYear.toString())
      .reduce((acc, h) => acc + h.stats.realized, 0);

    const objAnn = SITES_DATA.reduce((acc, s) => acc + s.annualObjective, 0);
    const objMens = Math.round(objAnn / 12);
    const objDay = Math.round(objAnn / WORKING_DAYS_YEAR);

    const baseResult: DashboardData = {
      date: latestDateStr,
      month: `${MONTHS_FR[targetMonth]} ${targetYear}`,
      year: targetYear,
      daily: { realized: history[0]?.stats.realized || 0, objective: objDay, percentage: objDay > 0 ? (history[0]?.stats.realized / objDay) * 100 : 0, fixed: history[0]?.stats.fixed || 0, mobile: history[0]?.stats.mobile || 0 },
      monthly: { realized: monthlyRealized, objective: objMens, percentage: objMens > 0 ? (monthlyRealized / objMens) * 100 : 0, fixed: monthlyFixed, mobile: monthlyMobile },
      annual: { realized: annualRealized, objective: objAnn, percentage: objAnn > 0 ? (annualRealized / objAnn) * 100 : 0, fixed: 0, mobile: 0 },
      dailyHistory: history,
      regions: regionsList
    };

    if (distributionUrl) {
      const distData = await fetchDistributions(distributionUrl);
      if (distData) baseResult.distributions = distData;
    }

    return baseResult;
  } catch (err) {
    console.error("fetchSheetData error:", err);
    throw err;
  }
};

export const saveRecordToSheet = async (url: string, payload: any): Promise<void> => {
  if (!url) throw new Error("URL du script non configurée.");
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    return;
  } catch (error) {
    console.error("Erreur d'enregistrement:", error);
    throw new Error("Connexion au serveur d'injection impossible.");
  }
};
