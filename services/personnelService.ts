
import { Personnel } from "../types.ts";

const cleanStr = (s: any): string => {
  if (s === null || s === undefined) return "";
  return s.toString().trim();
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

export const fetchPersonnel = async (url: string): Promise<Personnel[]> => {
  if (!url) return [];
  try {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`);
    if (!response.ok) return [];
    const text = await response.text();
    const rows = parseCSV(text);
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim());
    
    // Mapping headers to indices
    const idxStatut = headers.findIndex(h => h.includes('STATUT'));
    const idxMatricule = headers.findIndex(h => h.includes('MATRICULE') || h.includes('ID'));
    const idxNomPrenom = headers.findIndex(h => h.includes('NOM') && h.includes('PRENOM'));
    const idxDateNaissance = headers.findIndex(h => h.includes('NAISSANCE'));
    const idxSexe = headers.findIndex(h => h.includes('SEXE'));
    const idxAge = headers.findIndex(h => h === 'AGE');
    const idxEmploi = headers.findIndex(h => h.includes('EMPLOI') && !h.includes('CATEGORIE'));
    const idxSite = headers.findIndex(h => h.includes('SITE') || h.includes('CENTRE'));
    const idxService = headers.findIndex(h => h.includes('SERVICE') && !h.includes('ANTERIEUR'));
    const idxDateEmbauche = headers.findIndex(h => h.includes('EMBAUCHE'));
    const idxAnciennete = headers.findIndex(h => h.includes('ANCIENNETE'));
    const idxFonction = headers.findIndex(h => h.includes('FONCTION'));
    const idxPres = headers.findIndex(h => h.includes('PRES'));
    const idxCategorie = headers.findIndex(h => h.includes('CATEGORIE'));
    const idxType = headers.findIndex(h => h === 'TYPE');
    const idxDiplome = headers.findIndex(h => h.includes('DIPLOME'));
    const idxIndice = headers.findIndex(h => h.includes('INDICE'));
    const idxGrade = headers.findIndex(h => h.includes('GRADE'));
    const idxContact = headers.findIndex(h => h === 'CONTACT');
    const idxPersonneContact = headers.findIndex(h => h.includes('PERSONNE A CONTACTER'));
    const idxServiceAnterieur = headers.findIndex(h => h.includes('SERVICE ANTERIEUR'));
    const idxCessation = headers.findIndex(h => h.includes('CESSATION'));
    const idxObservation = headers.findIndex(h => h.includes('OBSERVATION'));

    return rows.slice(1).map(row => ({
      statut: cleanStr(row[idxStatut]),
      matricule: cleanStr(row[idxMatricule]),
      nomPrenom: cleanStr(row[idxNomPrenom]),
      dateNaissance: cleanStr(row[idxDateNaissance]),
      sexe: cleanStr(row[idxSexe]),
      age: parseInt(cleanStr(row[idxAge])) || 0,
      emploi: cleanStr(row[idxEmploi]),
      site: cleanStr(row[idxSite]),
      service: cleanStr(row[idxService]),
      dateEmbauche: cleanStr(row[idxDateEmbauche]),
      anciennete: cleanStr(row[idxAnciennete]),
      fonction: cleanStr(row[idxFonction]),
      pres: cleanStr(row[idxPres]),
      categorieEmploi: cleanStr(row[idxCategorie]),
      typeEmploi: cleanStr(row[idxType]),
      diplome: cleanStr(row[idxDiplome]),
      indiceSalariale: parseFloat(cleanStr(row[idxIndice]).replace(',', '.')) || 0,
      grade: cleanStr(row[idxGrade]),
      contact: cleanStr(row[idxContact]),
      personneAContacter: cleanStr(row[idxPersonneContact]),
      serviceAnterieur: cleanStr(row[idxServiceAnterieur]),
      cessation: cleanStr(row[idxCessation]),
      observation: cleanStr(row[idxObservation]),
    })).filter(p => p.nomPrenom || p.matricule);
  } catch (err) {
    console.error("Error fetching personnel:", err);
    return [];
  }
};
