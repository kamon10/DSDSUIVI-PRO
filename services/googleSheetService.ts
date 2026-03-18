
import { DashboardData, DailyHistoryRecord, DailyHistorySite, RegionData, SiteRecord, User, UserRole, DistributionRecord, DistributionStats, ActivityLog, StockRecord, GtsRecord } from "../types.ts";
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
  
  // Format ISO YYYY-MM-DD ou YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
  }
  
  // Format DD/MM/YYYY ou MM/DD/YYYY ou DD-MM-YYYY
  const commonMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (commonMatch) {
    let part1 = commonMatch[1].padStart(2, '0');
    let part2 = commonMatch[2].padStart(2, '0');
    let year = commonMatch[3];
    if (year.length === 2) year = "20" + year;
    
    const p1 = parseInt(part1);
    const p2 = parseInt(part2);
    
    // Heuristique pour distinguer DD/MM de MM/DD
    // Si p2 > 12, alors p2 est forcément le jour, donc format MM/DD/YYYY
    if (p2 > 12 && p1 <= 12) {
      return `${part2}/${part1}/${year}`;
    }
    // Par défaut on assume DD/MM/YYYY (standard FR)
    return `${part1}/${part2}/${year}`;
  }
  
  // Tentative de parsing natif pour les formats texte (ex: "18 Mar 2026")
  const nativeDate = new Date(s);
  if (!isNaN(nativeDate.getTime())) {
    const day = nativeDate.getDate().toString().padStart(2, '0');
    const month = (nativeDate.getMonth() + 1).toString().padStart(2, '0');
    const year = nativeDate.getFullYear();
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
        logo: config.logo || 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=934812425420904',
        hashtag: config.hashtag || '#DONSANG_CI'
      };
    } catch (e) {
      return null;
    }
  } catch (err) {
    return null;
  }
};

const normalizeHeader = (s: string): string => {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
};

export const parseDistributions = (text: string): {records: DistributionRecord[], stats: DistributionStats} | null => {
  try {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      console.warn("[Parser] BASE: Pas assez de lignes dans le CSV");
      return null;
    }

    const headers = rows[0].map(h => normalizeHeader(h));
    console.log("[Parser] BASE Headers détectés:", headers);

    const idxCode = headers.findIndex(h => h.includes('CODE') || h.includes('ID'));
    const idxDate = headers.findIndex(h => h.includes('DATE') || h.includes('JOUR') || h.includes('DATE DIST') || h.includes('DATE_DIST') || h.includes('PERIODE') || h.includes('TIME'));
    const idxSite = headers.findIndex(h => h.includes('SITE') || h.includes('STRUCTURE') || h.includes('SOURCE') || h.includes('SITE SOURCE'));
    const idxQty = headers.findIndex(h => h.includes('QUANTITE') || h.includes('QTE') || h.includes('NB') || h.includes('NOMBRE'));
    const idxProd = headers.findIndex(h => h.includes('PRODUIT') || h.includes('TYPE') || h.includes('PSL'));
    const idxGroup = headers.findIndex(h => h.includes('GROUPE') || h.includes('SANGUIN') || h.includes('GS'));
    const idxFacility = headers.findIndex(h => h.includes('ETABLISSEMENT') || h.includes('DESTINATION') || h.includes('CLIENT') || h.includes('STRUCTURE SERVIE'));
    const idxRendu = headers.findIndex(h => h.includes('RENDU') || h.includes('PERIME') || h.includes('RETOUR'));

    const records: DistributionRecord[] = [];
    let total = 0;
    let totalRendu = 0;
    
    rows.slice(1).forEach((row, rowIndex) => {
      const dateStr = cleanStr(row[idxDate >= 0 ? idxDate : 1]);
      if (!dateStr || dateStr.toLowerCase().includes('date')) return;

      const date = normalizeDate(dateStr);
      const siCode = cleanStr(row[idxCode >= 0 ? idxCode : 0]);
      
      // Si "Le stock equivaut au nombre de produit", alors chaque ligne = 1 unité
      // Sauf si une quantité explicite est présente et > 1 ? 
      // Pour être cohérent avec Stock, on va compter chaque ligne comme 1 unité distribuée.
      const qty = idxQty >= 0 ? (cleanNum(row[idxQty]) || 1) : 1; 
      const product = cleanStr(row[idxProd >= 0 ? idxProd : 5]);
      const group = cleanStr(row[idxGroup >= 0 ? idxGroup : 6]);
      const facility = cleanStr(row[idxFacility >= 0 ? idxFacility : 8]);
      const rendu = cleanNum(row[idxRendu >= 0 ? idxRendu : 9]);
      
      if (date) {
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

    console.log(`[Parser] BASE: ${records.length} enregistrements chargés.`);

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

const normalizeGroup = (g: string): string => {
  const s = cleanStr(g).toUpperCase();
  if (!s) return "N/A";
  if (s.includes('A') && s.includes('B')) {
    if (s.includes('+') || s.includes('POS')) return "AB+";
    if (s.includes('-') || s.includes('NEG')) return "AB-";
    return "AB+"; // Default to + if ambiguous
  }
  if (s.includes('A')) {
    if (s.includes('+') || s.includes('POS')) return "A+";
    if (s.includes('-') || s.includes('NEG')) return "A-";
    return "A+";
  }
  if (s.includes('B')) {
    if (s.includes('+') || s.includes('POS')) return "B+";
    if (s.includes('-') || s.includes('NEG')) return "B-";
    return "B+";
  }
  if (s.includes('O') || s === '0') {
    if (s.includes('+') || s.includes('POS')) return "O+";
    if (s.includes('-') || s.includes('NEG')) return "O-";
    return "O+";
  }
  return s;
};

export const parseStock = (text: string): StockRecord[] | null => {
  try {
    if (!text || text.includes("<!DOCTYPE")) {
      console.error("[Parser] STOCK: Le contenu semble être du HTML ou est vide.");
      return null;
    }

    const rows = parseCSV(text);
    if (rows.length < 2) {
      console.warn("[Parser] STOCK: Pas assez de lignes dans le CSV");
      return null;
    }

    const headers = rows[0].map(h => normalizeHeader(h));
    console.log("[Parser] STOCK Headers détectés:", headers);

    const idxPres = headers.findIndex(h => h.includes('PRES') || h.includes('POLE') || h.includes('COORDINATION') || h.includes('REGION'));
    const idxSite = headers.findIndex(h => h.includes('SITE') || h.includes('STRUCTURE') || h.includes('ETABLISSEMENT') || h.includes('POINT') || h.includes('DEPOT'));
    const idxProd = headers.findIndex(h => h.includes('PRODUIT') || h.includes('TYPE') || h.includes('PSL') || h.includes('ARTICLE'));
    const idxGroup = headers.findIndex(h => h.includes('GROUPE') || h.includes('SANGUIN') || h.includes('GS'));
    const idxQty = headers.findIndex(h => h.includes('QUANTITE') || h.includes('QTE') || h.includes('NB') || h.includes('NOMBRE') || h.includes('STOCK'));
    
    // On utilise une Map pour agréger les produits
    const aggregationMap = new Map<string, StockRecord>();

    rows.slice(1).forEach((row, rowIndex) => {
      // Fallback sur les index par défaut si non trouvés
      let pres = cleanStr(row[idxPres !== -1 ? idxPres : 0]);
      const site = cleanStr(row[idxSite !== -1 ? idxSite : 1]);
      const typeProduit = cleanStr(row[idxProd !== -1 ? idxProd : 2]);
      const groupeSanguin = normalizeGroup(row[idxGroup !== -1 ? idxGroup : 3]);
      
      // Si une colonne quantité existe, on l'utilise, sinon on compte 1 par ligne
      const qVal = idxQty !== -1 ? cleanNum(row[idxQty]) : 1;
      const quantite = qVal > 0 ? qVal : 1;

      // Validation de base : on ignore les lignes vides ou incomplètes
      if (site && typeProduit && groupeSanguin && groupeSanguin !== "N/A") {
        const siteInfo = getSiteByInput(site);
        const canonicalSite = siteInfo ? siteInfo.name : site;
        const canonicalPres = siteInfo ? siteInfo.region : (pres && pres !== "N/A" ? pres : "DIRECTION NATIONALE");

        const key = `${canonicalPres}|${canonicalSite}|${typeProduit}|${groupeSanguin}`;
        const existing = aggregationMap.get(key);
        
        if (existing) {
          existing.quantite += quantite;
        } else {
          aggregationMap.set(key, { 
            pres: canonicalPres, 
            site: canonicalSite, 
            typeProduit, 
            groupeSanguin, 
            quantite 
          });
        }
      } else if (rowIndex < 5) {
        // Log seulement pour les premières lignes pour aider au debug
        console.log(`[Parser] STOCK: Ligne ${rowIndex + 1} ignorée car incomplète: site="${site}", produit="${typeProduit}", groupe="${groupeSanguin}"`);
      }
    });

    const records = Array.from(aggregationMap.values());
    console.log(`[Parser] STOCK: ${records.length} groupes de produits chargés.`);
    return records;
  } catch (e) {
    console.error("Error parsing stock data:", e);
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

export const parseGts = (text: string): GtsRecord[] | null => {
  try {
    const rows = parseCSV(text);
    if (rows.length < 2) return null;

    const headers = rows[0].map(h => normalizeHeader(h));
    console.log("[Parser] GTS Headers:", headers);
    
    const idxDate = headers.findIndex(h => h.includes('CO_DCOLLECTE') || h.includes('DATE') || h.includes('JOUR') || h.includes('PERIODE') || h.includes('TIME'));
    const idxSite = headers.findIndex(h => h.includes('SI_CODE') || h.includes('SITE') || h.includes('STRUCTURE'));
    const idxLieu = headers.findIndex(h => h.includes('LI_NOM') || h.includes('LIEU') || h.includes('LIBELLE'));
    const idxCaCode = headers.findIndex(h => h.includes('CA_CODE'));
    const idxPvCode = headers.findIndex(h => h.includes('PV_CODE') || h.includes('TYPE PRELEVE'));
    const idxQty = headers.findIndex(h => h.includes('NOMBRE') || h.includes('QTE') || h.includes('QUANTITE'));

    const records: GtsRecord[] = [];
    rows.slice(1).forEach(row => {
      const date = normalizeDate(row[idxDate >= 0 ? idxDate : 6]);
      if (!date) return;

      const qty = cleanNum(row[idxQty >= 0 ? idxQty : 0]);
      const caCode = cleanStr(row[idxCaCode >= 0 ? idxCaCode : 2]).toUpperCase();
      const pvCode = cleanNum(row[idxPvCode >= 0 ? idxPvCode : 5]);
      const siteInput = cleanStr(row[idxSite >= 0 ? idxSite : 1]);
      const siteInfo = getSiteByInput(siteInput);
      
      const isFixe = caCode === 'Z';
      
      let fixe = 0;
      let mobile = 0;
      let autoTransfusion = 0;

      if (pvCode === 1 || pvCode === 3) {
        if (isFixe) fixe = qty;
        else mobile = qty;
      } else if (pvCode === 2 || pvCode === 4) {
        autoTransfusion = qty;
      }

      records.push({
        date,
        site: siteInfo?.name || siteInput || "SITE INCONNU",
        region: siteInfo?.region || "AUTRES",
        lieu: cleanStr(row[idxLieu >= 0 ? idxLieu : 7]),
        caCode,
        pvCode,
        fixe,
        mobile,
        autoTransfusion,
        total: fixe + mobile
      });
    });

    return records;
  } catch (e) {
    console.error("Error parsing GTS data:", e);
    return null;
  }
};

export const fetchGts = async (url: string): Promise<GtsRecord[] | null> => {
  if (!url || !url.startsWith('http')) return null;
  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`);
    if (!response.ok) return null;
    const text = await response.text();
    return parseGts(text);
  } catch (e) {
    return null;
  }
};

export const fetchSheetData = async (url: string, force = false, distributionUrl?: string, dynamicSites: any[] = [], stockUrl?: string, gtsUrl?: string): Promise<DashboardData | null> => {
  try {
    const fetchWithRetry = async (targetUrl: string, key: string, retries = 2): Promise<{ text: string, hasChanged: boolean, error: boolean }> => {
      if (!targetUrl || !targetUrl.startsWith('http')) {
        console.warn(`Source ${key} URL invalide ou manquante.`);
        return { text: lastRawContent[key] || '', hasChanged: false, error: true };
      }
      
      const urlWithCacheBusting = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      
      for (let i = 0; i <= retries; i++) {
        console.log(`[Sync] Tentative ${i + 1}/${retries + 1} pour ${key}...`);
        
        const strategies = [
          async () => fetch(`/api/proxy?url=${encodeURIComponent(urlWithCacheBusting)}`),
          async () => fetch(urlWithCacheBusting, { 
            method: 'GET',
            headers: { 'Accept': 'text/csv, text/plain, */*' },
            credentials: 'omit'
          }),
          async () => fetch(`https://corsproxy.io/?${encodeURIComponent(urlWithCacheBusting)}`, { credentials: 'omit' }),
          async () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlWithCacheBusting)}`, { credentials: 'omit' }),
          async () => fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlWithCacheBusting)}`, { credentials: 'omit' })
        ];

        for (let j = 0; j < strategies.length; j++) {
          try {
            const response = await strategies[j]();
            if (response.ok) {
              const text = await response.text();
              if (text && !text.includes("<!DOCTYPE") && text.trim().length > 0) {
                const hasChanged = force || text !== lastRawContent[key];
                lastRawContent[key] = text;
                return { text, hasChanged, error: false };
              }
              console.warn(`[Sync] Contenu invalide reçu pour ${key} via stratégie ${j+1}. Longueur: ${text?.length}, Début: ${text?.substring(0, 50)}`);
            } else {
              console.warn(`[Sync] Stratégie ${j+1} échouée pour ${key} (Status: ${response.status})`);
            }
          } catch (e: any) {
            console.warn(`[Sync] Erreur stratégie ${j+1} pour ${key}:`, e.message || e);
          }
        }

        if (i < retries) {
          const delay = 1000 * (i + 1);
          console.log(`[Sync] Toutes les stratégies ont échoué pour ${key}. Nouvelle tentative dans ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }

      console.error(`[Sync] Échec définitif pour ${key} après toutes les tentatives.`);
      // Si on a un cache, on l'utilise même si on marque une erreur
      return { text: lastRawContent[key] || '', hasChanged: false, error: true };
    };

    // Récupération séquentielle pour éviter les limites de connexion du navigateur
    const collecteResult = await fetchWithRetry(url, 'collecte');
    const distResult = distributionUrl ? await fetchWithRetry(distributionUrl, 'BASE') : { text: '', hasChanged: false, error: false };
    const stockResult = stockUrl ? await fetchWithRetry(stockUrl, 'STOCK') : { text: '', hasChanged: false, error: false };
    const gtsResult = gtsUrl ? await fetchWithRetry(gtsUrl, 'GTS') : { text: '', hasChanged: false, error: false };

    if (stockResult.error && stockUrl) {
      console.warn(`[Sync] Échec de récupération pour STOCK. Utilisation du cache si disponible.`);
    }

    if (collecteResult.text) {
      console.log(`[Sync] Collecte reçue (${collecteResult.text.length} chars). Début: ${collecteResult.text.substring(0, 50)}...`);
    }

    // Si la collecte échoue et qu'on n'a rien en cache, on ne peut rien faire
    if (collecteResult.error && !collecteResult.text) {
      throw new Error("Impossible de charger la source principale (Collecte)");
    }

    if (!force && !collecteResult.hasChanged && !distResult.hasChanged && !stockResult.hasChanged && !gtsResult.hasChanged) {
      return null;
    }

    const rows = parseCSV(collecteResult.text);
    if (rows.length < 2) {
      if (collecteResult.text.includes("<!DOCTYPE")) {
        throw new Error("La source Collecte semble être une page HTML (vérifiez que le lien est bien un export CSV)");
      }
      throw new Error("Fichier source Collecte vide ou mal formaté.");
    }

    // Détection dynamique des colonnes pour la collecte
    const headers = rows[0].map(h => normalizeHeader(h));
    console.log("[Parser] COLLECTE Headers détectés:", headers);

    const col = {
      date: headers.findIndex(h => h.includes('DATE') || h.includes('JOUR') || h.includes('PERIODE') || h.includes('TIME')),
      code: headers.findIndex(h => h.includes('CODE') || h.includes('ID')),
      site: headers.findIndex(h => h.includes('SITE') || h.includes('STRUCTURE')),
      fixe: headers.findIndex(h => h.includes('FIXE')),
      mobile: headers.findIndex(h => h.includes('MOBILE')),
      total: headers.findIndex(h => h.includes('TOTAL') || h.includes('SOMME') || h.includes('REALISE'))
    };

    // Fallback sur les index par défaut si non trouvés
    if (col.date === -1) {
      // Tentative de détection automatique de la colonne date
      for (let i = 0; i < (rows[1]?.length || 0); i++) {
        const val = normalizeDate(rows[1][i]);
        if (val.includes('/') && val.split('/').length === 3) {
          col.date = i;
          console.log(`[Parser] Colonne DATE auto-détectée à l'index ${i}`);
          break;
        }
      }
      if (col.date === -1) col.date = 0;
    }
    if (col.code === -1) col.code = 1;
    if (col.site === -1) col.site = 2;
    if (col.fixe === -1) col.fixe = 5;
    if (col.mobile === -1) col.mobile = 7;
    if (col.total === -1) col.total = 8;

    let latestDateObj = new Date(2000, 0, 1);
    const validRows: any[] = [];

    rows.slice(1).forEach(row => {
      const dateStr = normalizeDate(row[col.date]);
      if (!dateStr) return;
      
      const parts = dateStr.split('/');
      if (parts.length !== 3) return;
      
      const [d, m, y] = parts.map(Number);
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
    const gts = gtsResult.text ? parseGts(gtsResult.text) : undefined;

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
      stock: stock || undefined,
      gts: gts || undefined
    };
  } catch (err: any) {
    console.error("Erreur fatale lors du chargement des données du tableau de bord:", err.message || err);
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
