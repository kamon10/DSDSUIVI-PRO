
import { DashboardData, SiteRecord, DailyHistorySite, DailyHistoryRecord } from "../types";
import { getSiteName, getSiteRegion, getSiteObjectives, getSiteByInput, SITES_DATA, WORKING_DAYS_YEAR } from "../constants";

export const saveRecordToSheet = async (scriptUrl: string, record: any) => {
  if (!scriptUrl) throw new Error("URL Apps Script non configurée.");
  const cleanUrl = scriptUrl.trim();
  
  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors', 
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(record)
    });
    return true;
  } catch (error: any) {
    console.error("Erreur de communication:", error);
    throw new Error("Erreur de connexion au script. Vérifiez l'URL.");
  }
};

const cleanNum = (val: any): number => {
  if (val === undefined || val === null || val === "") return 0;
  const str = String(val).replace(/\u00A0/g, ' ').trim();
  const cleaned = str.replace(/[^-0-9,.]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n);
};

const normalize = (str: string): string => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[\s\-_]/g, "");
};

export const extractSheetParams = (input: string) => {
  const params = { id: "", gid: "0", isPub: false };
  const pubMatch = input.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch) {
    params.id = pubMatch[1];
    params.isPub = true;
    const gidMatch = input.match(/gid=([0-9]+)/);
    if (gidMatch) params.gid = gidMatch[1];
    return params;
  }
  const idMatch = input.match(/\/d\/([a-zA-Z0-9-_]{20,})/);
  if (idMatch) {
    params.id = idMatch[1];
    const gidMatch = input.match(/gid=([0-9]+)/);
    if (gidMatch) params.gid = gidMatch[1];
  } else {
    params.id = input.trim();
  }
  return params;
};

const parseCsv = (text: string) => {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];
  const firstLine = lines[0];
  const delimiters = [';', ',', '\t'];
  let sep = ',';
  let maxCount = -1;
  delimiters.forEach(d => {
    const count = firstLine.split(d).length;
    if (count > maxCount) { maxCount = count; sep = d; }
  });
  return lines.map(line => {
    const row: string[] = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === sep && !inQuotes) { row.push(current.trim()); current = ''; }
      else current += char;
    }
    row.push(current.trim());
    return row;
  });
};

export const fetchDirectoryData = async (sheetInput: string) => {
  const { id, gid, isPub } = extractSheetParams(sheetInput);
  const url = isPub 
    ? `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;

  try {
    const response = await fetch(`${url}&_t=${Date.now()}`);
    if (!response.ok) return null;
    const csvText = await response.text();
    return parseCsv(csvText);
  } catch (err) {
    return null;
  }
};

export const fetchSheetData = async (sheetInput: string): Promise<Partial<DashboardData>> => {
  const { id, gid, isPub } = extractSheetParams(sheetInput);
  const url = isPub 
    ? `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;

  try {
    const response = await fetch(`${url}&_t=${Date.now()}`);
    if (!response.ok) throw new Error("Impossible d'accéder au fichier Google Sheet.");
    const csvText = await response.text();
    const allRows = parseCsv(csvText);
    if (allRows.length < 1) throw new Error("Le fichier est vide.");

    let headerIdx = -1;
    for (let i = 0; i < Math.min(allRows.length, 20); i++) {
      const rowStr = allRows[i].join("|").toUpperCase();
      if (rowStr.includes("SITE") || rowStr.includes("DATE") || rowStr.includes("LIBELLE")) { headerIdx = i; break; }
    }
    if (headerIdx === -1) headerIdx = 0;

    const headers = allRows[headerIdx].map(h => normalize(h));
    const findCol = (terms: string[], exclude: string[] = []) => {
      const nt = terms.map(t => normalize(t));
      const ne = exclude.map(t => normalize(t));
      return headers.findIndex(h => nt.some(t => h === t || h.includes(t)) && !ne.some(t => h === t || h.includes(t)));
    };

    const idx = {
      date: findCol(["DATECOLLECTE", "JOUR", "DATE"]),
      libelle: findCol(["LIBELLESITE", "SITE", "STRUCTURE"]),
      fixe: findCol(["NOMBREFIXE", "FIXE"], ["ACTIVITE"]),
      mobile: findCol(["NOMBREMOBILE", "MOBILE"], ["ACTIVITE"]),
    };

    const dataRows = allRows.slice(headerIdx + 1).filter(r => r[idx.libelle] && r[idx.libelle].trim() !== "" && !normalize(r[idx.libelle]).includes("TOTAL"));
    if (dataRows.length === 0) throw new Error("Aucune donnée trouvée.");

    const historyMap = new Map<string, any>();
    const siteAggregator = new Map<string, SiteRecord & { region?: string }>();

    dataRows.forEach(row => {
      const dateVal = row[idx.date] ? row[idx.date].trim() : "01/01/2026";
      const rawSiteName = row[idx.libelle] ? row[idx.libelle].toUpperCase().trim() : "SITE INCONNU";
      
      const siteRef = getSiteByInput(rawSiteName);
      const siteName = getSiteName(rawSiteName);
      const regionName = getSiteRegion(rawSiteName);
      const siteObjs = getSiteObjectives(rawSiteName);
      
      const valFixed = cleanNum(row[idx.fixe]);
      const valMobile = cleanNum(row[idx.mobile]);
      const valTotal = valFixed + valMobile;

      if (!historyMap.has(dateVal)) {
        historyMap.set(dateVal, { 
          date: dateVal, stats: { realized: 0, fixed: 0, mobile: 0 }, 
          sites: new Map<string, DailyHistorySite>() 
        });
      }
      const h = historyMap.get(dateVal);
      h.stats.realized += valTotal;
      h.stats.fixed += valFixed;
      h.stats.mobile += valMobile;
      
      if (!h.sites.has(siteName)) {
        h.sites.set(siteName, { 
          name: siteName, 
          region: regionName, 
          fixe: 0, 
          mobile: 0, 
          total: 0, 
          objective: siteObjs.daily,
          manager: siteRef?.manager,
          email: siteRef?.email,
          phone: siteRef?.phone
        });
      }
      const hs = h.sites.get(siteName);
      hs.fixe += valFixed; hs.mobile += valMobile; hs.total += valTotal;

      if (!siteAggregator.has(siteName)) {
        siteAggregator.set(siteName, {
          name: siteName, region: regionName, fixe: 0, mobile: 0, totalJour: 0, totalMois: 0, 
          objDate: siteObjs.daily, objMensuel: siteObjs.monthly,
          manager: siteRef?.manager,
          email: siteRef?.email,
          phone: siteRef?.phone
        });
      }
      const gs = siteAggregator.get(siteName)!;
      gs.totalMois += valTotal;
      gs.fixe += valFixed;
      gs.mobile += valMobile;
    });

    const dailyHistory: DailyHistoryRecord[] = Array.from(historyMap.values()).map(h => ({
      date: h.date,
      stats: h.stats,
      sites: Array.from(h.sites.values()) as DailyHistorySite[]
    })).sort((a, b) => {
      const parseD = (s: string) => {
        const p = s.split('/');
        return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime() : 0;
      };
      return parseD(b.date) - parseD(a.date);
    });

    const latest = dailyHistory[0] || { stats: { realized: 0, fixed: 0, mobile: 0 }, date: "Inconnue" };
    const totalRealized = dailyHistory.reduce((acc, h) => acc + h.stats.realized, 0);
    const totalFixed = dailyHistory.reduce((acc, h) => acc + h.stats.fixed, 0);
    const totalMobile = dailyHistory.reduce((acc, h) => acc + h.stats.mobile, 0);

    const nationalObjAnnual = SITES_DATA.reduce((acc, s) => acc + s.annualObjective, 0);
    const nationalObjMonthly = Math.round(nationalObjAnnual / 12);
    const nationalObjDaily = Math.round(nationalObjAnnual / WORKING_DAYS_YEAR);

    const regionsMap = new Map<string, any[]>();
    siteAggregator.forEach((site) => {
      const reg = site.region || "DIRECTION NATIONALE";
      if (!regionsMap.has(reg)) regionsMap.set(reg, []);
      regionsMap.get(reg)!.push(site);
    });

    return {
      date: latest.date,
      month: "janvier",
      year: 2026,
      daily: { realized: latest.stats.realized, objective: nationalObjDaily, percentage: (latest.stats.realized / nationalObjDaily) * 100, fixed: latest.stats.fixed, mobile: latest.stats.mobile },
      monthly: { realized: totalRealized, objective: nationalObjMonthly, percentage: (totalRealized / nationalObjMonthly) * 100, fixed: totalFixed, mobile: totalMobile },
      annual: { realized: totalRealized, objective: nationalObjAnnual, percentage: (totalRealized / nationalObjAnnual) * 100, fixed: totalFixed, mobile: totalMobile },
      regions: Array.from(regionsMap.entries()).map(([name, sites]) => ({ name, color: "#ef4444", sites })),
      dailyHistory
    };
  } catch (err) { console.error("fetchSheetData error:", err); throw err; }
};
