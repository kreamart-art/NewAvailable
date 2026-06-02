import React, { useEffect, useState, useMemo } from "react";
import { storage, onRemoteUpdate, startSync, stopSync } from "./api";

// =====================================================================
// SKELET — bouw hier de volledige app.
// Bron: docs/SPECIFICATION.md (§10 voor de UI) en docs/IMPLEMENTATION_PLAN.md.
// Exacte herbruikbare snippets staan in docs/reference/*.md.
// Bouwblokken klaar voor gebruik in deze map:
//   AuthScreen.jsx, DatePicker.jsx, CsvImport.jsx, Household.jsx,
//   categorize.js, push.js, en api.js (storage + versie/merge + sync).
//
// Het laden van data, de normalisatie (incl. tombstones) en de live-sync
// zijn hieronder al correct bedraad — bouw de UI en handlers erbovenop.
// =====================================================================

const DEFAULTS = { reservePct: 35, reserveOn: true };

export default function BudgetApp({ onLogout }) {
  const [data, setData] = useState({ transactions: [], goals: [], budgets: {}, settings: { ...DEFAULTS }, deleted: {} });
  const [loading, setLoading] = useState(true);

  // Normaliseer alle binnenkomende data via deze ene functie.
  const applyData = (d) => setData({
    transactions: d.transactions || [],
    goals: d.goals || [],
    budgets: d.budgets || {},
    settings: { ...DEFAULTS, ...(d.settings || {}) },
    deleted: d.deleted || {},
  });

  useEffect(() => {
    onRemoteUpdate(applyData); // samenvoegingen op afstand verschijnen vanzelf
    (async () => {
      try { const r = await storage.get("budget"); if (r?.value) applyData(JSON.parse(r.value)); }
      catch (e) { console.error(e); }
      setLoading(false);
    })();
    const syncId = startSync(15000);
    return () => stopSync(syncId);
  }, []);

  // Sla de volledige status op. De storage-adapter regelt versie-controle en
  // bij een conflict de samenvoeging (en roept dan applyData via onRemoteUpdate aan).
  const persist = async (next) => {
    setData(next);
    try { await storage.set("budget", JSON.stringify(next)); }
    catch (e) { console.error(e); }
  };

  // Voorbeeld van een handler met tombstone (zie reference 02):
  // const delTx = (id) => persist({
  //   ...data,
  //   transactions: data.transactions.filter((x) => x.id !== id),
  //   deleted: { ...data.deleted, [id]: new Date().toISOString() },
  // });

  // Filter verwijderde items uit weergaven (defensief én nodig na een merge):
  const liveTransactions = useMemo(
    () => data.transactions.filter((x) => !data.deleted?.[x.id]),
    [data.transactions, data.deleted]
  );

  if (loading) return <p style={{ padding: 40, fontFamily: "system-ui", color: "#7A7E73" }}>Laden…</p>;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24 }}>Budgetboek</h1>
      <p style={{ color: "#7A7E73", lineHeight: 1.5 }}>
        Skelet. Bouw hier het dashboard, transacties, budget, forecast, doelen en de modals.
        Zie <code>docs/SPECIFICATION.md §10</code> en het <code>docs/IMPLEMENTATION_PLAN.md</code>.
      </p>
      <p style={{ color: "#7A7E73" }}>Geladen transacties: {liveTransactions.length}</p>
      <button onClick={onLogout} style={{ marginTop: 12, padding: "10px 16px", borderRadius: 10, border: "1px solid #E6E1D4", background: "#fff", cursor: "pointer" }}>
        Uitloggen
      </button>
    </div>
  );
}
