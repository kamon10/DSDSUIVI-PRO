
import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Loader2, Table, ArrowRight, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSQLPrelevements, fetchSQLStocks, SQLPrelevement, SQLStock } from '../services/sqlService.ts';
import { DashboardData } from '../types.ts';

interface SQLTestViewProps {
  data: DashboardData;
  user: any;
}

export const SQLTestView: React.FC<SQLTestViewProps> = ({ data, user }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [sqlPrelevements, setSqlPrelevements] = useState<SQLPrelevement[]>([]);
  const [sqlStocks, setSqlStocks] = useState<SQLStock[]>([]);
  const [diagnostics, setDiagnostics] = useState<{ 
    tables: { TABLE_SCHEMA: string; TABLE_NAME: string }[],
    columns?: { COLUMN_NAME: string; DATA_TYPE: string }[]
  } | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setStatus({ type: null, message: '' });
    try {
      const [prelevs, stocks, diag] = await Promise.all([
        fetchSQLPrelevements(),
        fetchSQLStocks(),
        fetch('/api/sql/diagnostics').then(r => r.json())
      ]);
      setSqlPrelevements(prelevs);
      setSqlStocks(stocks);
      setDiagnostics(diag);
      setStatus({ type: 'success', message: 'Données SQL actualisées avec succès.' });
    } catch (err: any) {
      console.error("Failed to refresh SQL data:", err);
      setStatus({ type: 'error', message: `Erreur: ${err.message}` });
      // If data fetch failed, still try to get diagnostics
      try {
        const diag = await fetch('/api/sql/diagnostics').then(r => r.json());
        setDiagnostics(diag);
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Server className="text-indigo-600" size={28} />
            CONSULTATION SQL SERVER
          </h2>
          <p className="text-slate-500 font-medium">Lecture directe des données GTS</p>
        </div>
        <button 
          onClick={refreshData}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Actualiser les données
        </button>
      </div>

      <AnimatePresence>
        {status.type === 'error' && (status.message.toLowerCase().includes('timeout') || status.message.toLowerCase().includes('atteindre') || status.message.toLowerCase().includes('connect')) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-50 border border-rose-100 rounded-[2.5rem] p-8 mb-6"
          >
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-rose-800">
              <AlertCircle size={16} />
              Aide au Dépannage Réseau
            </h3>
            <div className="space-y-4 text-xs text-rose-700 font-medium leading-relaxed">
              <p>
                L'erreur de <strong>Connexion</strong> indique que l'application ne parvient pas à atteindre votre serveur SQL. 
                Voici les points à vérifier :
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>IP Publique :</strong> L'adresse IP configurée semble être locale ou inaccessible. 
                  L'application étant dans le cloud, elle ne peut pas accéder à votre réseau local directement. 
                  Utilisez une <strong>IP publique</strong> ou un service comme <strong>ngrok</strong>.
                </li>
                <li>
                  <strong>Pare-feu :</strong> Le port <code className="bg-rose-100 px-1 rounded">1433</code> doit être ouvert en entrée sur votre serveur SQL 
                  et sur votre routeur (Port Forwarding).
                </li>
                <li>
                  <strong>SQL Server Browser :</strong> Vérifiez que le service SQL Server Browser est actif si vous utilisez une instance nommée.
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
        {diagnostics && diagnostics.tables && diagnostics.tables.length > 0 && (
          <div className="bg-amber-50 rounded-[2.5rem] border border-amber-100 p-8">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-amber-800">
              <AlertCircle size={16} />
              Diagnostic : Tables trouvées dans votre base GTS
            </h3>
            <p className="text-xs text-amber-700 mb-4 font-medium">
              Si vous voyez vos tables ci-dessous, veuillez me donner leurs noms exacts pour que je puisse corriger les requêtes.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {diagnostics.tables.map((t, i) => (
                <span key={i} className="px-3 py-1 bg-white border border-amber-200 rounded-full text-[10px] font-black text-amber-900">
                  {t.TABLE_SCHEMA}.{t.TABLE_NAME}
                </span>
              ))}
            </div>
            {diagnostics.columns && diagnostics.columns.length > 0 && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-2">Colonnes de T_STOCKS :</h4>
                <div className="flex flex-wrap gap-2">
                  {diagnostics.columns.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-100 rounded text-[9px] font-bold text-amber-900">
                      {c.COLUMN_NAME} ({c.DATA_TYPE})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Table size={16} className="text-indigo-600" />
              Table: prelevements ({sqlPrelevements.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Site</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Lieu</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Fixe</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Mobile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sqlPrelevements.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-900">{p.site}</td>
                    <td className="px-6 py-4 text-[10px] font-medium text-slate-500">{p.lieu}</td>
                    <td className="px-6 py-4 text-[10px] font-medium text-slate-500">{p.date_collecte}</td>
                    <td className="px-6 py-4 text-[10px] font-black text-indigo-600 text-center">{p.fixe}</td>
                    <td className="px-6 py-4 text-[10px] font-black text-emerald-600 text-center">{p.mobile}</td>
                  </tr>
                ))}
                {sqlPrelevements.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Aucune donnée trouvée dans la table 'prelevements'</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Table size={16} className="text-emerald-600" />
              Table: stocks ({sqlStocks.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Produit</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Groupe</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Quantité</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Péremption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sqlStocks.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-900">{s.produit}</td>
                    <td className="px-6 py-4 text-[10px] font-medium text-slate-500">{s.groupe}</td>
                    <td className="px-6 py-4 text-[10px] font-black text-indigo-600 text-center">{s.quantite}</td>
                    <td className="px-6 py-4 text-[10px] font-medium text-slate-500">{s.peremption}</td>
                  </tr>
                ))}
                {sqlStocks.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Aucune donnée trouvée dans la table 'stocks'</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {status.type && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 ${status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}
          >
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-xs font-black uppercase tracking-tight">{status.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
        <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
          <Database size={16} className="text-blue-400" />
          Note Technique : Mode Consultation
        </h3>
        <p className="text-xs font-medium text-slate-400 leading-relaxed">
          L'application est configurée en mode <strong>lecture seule</strong> pour SQL Server. 
          Elle interroge directement vos tables existantes sans effectuer de modifications. 
          Si les tableaux ci-dessus sont vides ou affichent une erreur, veuillez vérifier que les noms des tables 
          (<code className="text-blue-400">prelevements</code> et <code className="text-blue-400">stocks</code>) 
          et des colonnes correspondent à votre schéma.
        </p>
      </div>
    </div>
  );
};
