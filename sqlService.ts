
export interface SQLPrelevement {
  id?: number;
  site: string;
  lieu: string;
  region: string;
  date_collecte: string;
  fixe: number;
  mobile: number;
}

export interface SQLStock {
  id?: number;
  produit: string;
  groupe: string;
  quantite: number;
  peremption: string;
}

export const fetchSQLPrelevements = async (): Promise<SQLPrelevement[]> => {
  const response = await fetch('/api/sql/prelevements');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Erreur serveur (${response.status})`);
  }
  return response.json();
};

export const fetchSQLStocks = async (): Promise<SQLStock[]> => {
  const response = await fetch('/api/sql/stocks');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Erreur serveur (${response.status})`);
  }
  return response.json();
};
