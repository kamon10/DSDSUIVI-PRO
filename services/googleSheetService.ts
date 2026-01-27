
import { DashboardData, DailyHistoryRecord, DailyHistorySite, RegionData, SiteRecord } from "../types.ts";
import { getSiteObjectives, SITES_DATA, WORKING_DAYS_YEAR, getSiteByInput } from "../constants.tsx";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const cleanStr = (s: any): string => {
  if (s === null || s === undefined) return "";
  const str = s.toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const upper = str.toUpperCase();
  if (upper === "#N/A" || upper === "N/A" || upper === "#REF!" || upper === "#VALEUR!" || upper === "#VALUE!") {
    return "";
  }
  return str;
};

const normalizeDate = (d: string): string => {
  const s = cleanStr(d);
  if (!s) return "";
  if (s.includes('-') && s.length >= 10) {
    const parts = s.split('-');
    if (parts.length >= 3) {
      return `${parts[2].substring(0,2).padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
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
  const firstLine = lines[0];
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
  const s = cleanStr(val).replace(/[^\d,.-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
};

export const fetchSheetData = async (url: string): Promise<DashboardData> => {
  let csvUrl = url.trim();
  if (csvUrl.includes('docs.google.com')) {
    const id = csvUrl.match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/)?.[1];
    if (id) {
      const gidMatch = csvUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      csvUrl = csvUrl.includes('/pub') 
        ? `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&gid=${gid}`
        : `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    }
  }

  const response = await fetch(`${csvUrl}${csvUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`);
  if (!response.ok) throw new Error("Accès au fichier impossible.");
  
  const text = await response.text();
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("Le fichier semble vide.");

  const col = { date: 0, code: 1, site: 2, fixe: 5, mobile: 7, total: 8 };

  // 1. Premier passage pour identifier la date la plus récente
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

  if (validRows.length === 0) throw new Error("Données de date invalides.");

  const targetMonth = latestDateObj.getMonth();
  const targetYear = latestDateObj.getFullYear();
  const latestDateStr = `${latestDateObj.getDate().toString().padStart(2, '0')}/${(latestDateObj.getMonth() + 1).toString().padStart(2, '0')}/${latestDateObj.getFullYear()}`;

  // 2. Agrégation avec filtrage temporel
  const historyMap = new Map<string, DailyHistoryRecord>();
  const siteMonthlyAgg = new Map<string, { f: number, m: number, t: number, lastT: number, lastF: number, lastM: number }>();
  let annualRealized = 0;

  validRows.forEach(({ row, dateObj, dateStr }) => {
    const codeRaw = cleanStr(row[col.code]);
    const siteRaw = cleanStr(row[col.site]);
    const siteInfo = getSiteByInput(codeRaw) || getSiteByInput(siteRaw);
    const finalSiteName = siteInfo ? siteInfo.name : (siteRaw || codeRaw);
    const finalRegion = siteInfo ? siteInfo.region : "AUTRES SITES";

    const f = cleanNum(row[col.fixe]);
    const m = cleanNum(row[col.mobile]);
    const t = cleanNum(row[col.total]) || (f + m);

    // Annuel (même année)
    if (dateObj.getFullYear() === targetYear) {
      annualRealized += t;
    }

    // Journalier
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

    // Mensuel (Même mois et même année)
    if (dateObj.getMonth() === targetMonth && dateObj.getFullYear() === targetYear) {
      if (!siteMonthlyAgg.has(finalSiteName)) {
        siteMonthlyAgg.set(finalSiteName, { f: 0, m: 0, t: 0, lastT: 0, lastF: 0, lastM: 0 });
      }
      const agg = siteMonthlyAgg.get(finalSiteName)!;
      agg.f += f; agg.m += m; agg.t += t;
      if (dateStr === latestDateStr) {
        agg.lastT = t; agg.lastF = f; agg.lastM = m;
      }
    }
  });

  const history = Array.from(historyMap.values()).sort((a, b) => {
    const [da, ma, ya] = a.date.split('/').map(Number);
    const [db, mb, yb] = b.date.split('/').map(Number);
    return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
  });

  const regionsMap = new Map<string, RegionData>();
  siteMonthlyAgg.forEach((stats, name) => {
    const siteInfo = getSiteByInput(name);
    const regName = siteInfo ? siteInfo.region : "AUTRES SITES";
    
    // Ignorer explicitement la catégorie "AUTRES SITES"
    if (regName === "AUTRES SITES") return;

    if (!regionsMap.has(regName)) regionsMap.set(regName, { name: regName, sites: [] });
    
    const siteObjs = getSiteObjectives(name);
    regionsMap.get(regName)!.sites.push({
      name, region: regName, fixe: stats.lastF, mobile: stats.lastM,
      totalJour: stats.lastT, totalMois: stats.t,
      objDate: 0,
      objMensuel: siteObjs.monthly,
      manager: siteInfo?.manager, email: siteInfo?.email, phone: siteInfo?.phone
    });
  });

  const monthlyRealized = Array.from(siteMonthlyAgg.values()).reduce((acc, s) => acc + s.t, 0);
  const monthlyFixed = Array.from(siteMonthlyAgg.values()).reduce((acc, s) => acc + s.f, 0);
  const monthlyMobile = Array.from(siteMonthlyAgg.values()).reduce((acc, s) => acc + s.m, 0);

  const objAnn = SITES_DATA.reduce((acc, s) => acc + s.annualObjective, 0);
  const objMens = Math.round(objAnn / 12);
  const objDay = Math.round(objAnn / WORKING_DAYS_YEAR);

  return {
    date: latestDateStr,
    month: `${MONTHS_FR[targetMonth]} ${targetYear}`,
    year: targetYear,
    daily: { realized: history[0].stats.realized, objective: objDay, percentage: objDay > 0 ? (history[0].stats.realized / objDay) * 100 : 0, fixed: history[0].stats.fixed, mobile: history[0].stats.mobile },
    monthly: { realized: monthlyRealized, objective: objMens, percentage: objMens > 0 ? (monthlyRealized / objMens) * 100 : 0, fixed: monthlyFixed, mobile: monthlyMobile },
    annual: { realized: annualRealized, objective: objAnn, percentage: objAnn > 0 ? (annualRealized / objAnn) * 100 : 0, fixed: 0, mobile: 0 },
    dailyHistory: history,
    regions: Array.from(regionsMap.values()).sort((a,b) => a.name.localeCompare(b.name))
  };
};

export const saveRecordToSheet = async (url: string, payload: any) => {
  await fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};
