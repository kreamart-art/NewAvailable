import React, { useEffect, useState, useMemo } from "react";
import { storage, onRemoteUpdate, startSync, stopSync, api } from "./api";
import {
  Settings, Plus, Home, Briefcase, Layers, Search, X, Check, Trash2,
  Bell, BellRing, Wallet, Target, PiggyBank,
  TrendingUp, ArrowDownRight, ArrowUpRight, AlertTriangle,
  Lightbulb, Repeat, Upload, Download, Users, LogOut, ShieldAlert,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DatePicker from "./DatePicker";
import CsvImport from "./CsvImport";
import Household from "./Household";
import { push } from "./push";

// =====================================================================
// Budgetboek — volledige app. Zie docs/SPECIFICATION.md §10.
// Het laden van data, de normalisatie (incl. tombstones) en de live-sync
// zijn correct bedraad; de UI en handlers staan erbovenop.
// =====================================================================

const DEFAULTS = { reservePct: 35, reserveOn: true };

const CATS = {
  prive: {
    uitgave: ["Wonen", "Boodschappen", "Vervoer", "Verzekeringen", "Abonnementen", "Vrije tijd", "Zorg", "Overig"],
    inkomst: ["Salaris", "Toeslagen", "Cadeau", "Overig"],
  },
  zakelijk: {
    uitgave: ["Software & tools", "Marketing", "Kantoor", "Belasting & BTW", "Verzekeringen", "Uitbesteding", "Overig"],
    inkomst: ["Freelance", "Project", "Overig"],
  },
};

const MONTHS_NL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

const uid = () => Math.random().toString(36).slice(2, 10);
const eur = (n) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const eur2 = (n) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n || 0);
const signed = (t) => (t.type === "inkomst" ? t.amount : -t.amount);
const isoDay = (iso) => (iso || "").slice(0, 10);
const dateToISO = (ymd) => `${ymd}T00:00:00.000Z`;

// --------------------------------------------------------------------- main
export default function BudgetApp({ onLogout }) {
  const [data, setData] = useState({ transactions: [], goals: [], budgets: {}, settings: { ...DEFAULTS }, deleted: {} });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overzicht");
  const [scope, setScope] = useState("alles"); // alles | prive | zakelijk
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [toastMsg, setToastMsg] = useState(null);
  const [txModal, setTxModal] = useState(null);   // { initial } | null
  const [goalModal, setGoalModal] = useState(null);
  const [topUp, setTopUp] = useState(null);        // goal
  const [budgetModal, setBudgetModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hhOpen, setHhOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2600); };

  // Normaliseer alle binnenkomende data via deze ene functie (zie ref 02 / SPEC §7.4).
  const applyData = (d) => setData({
    transactions: d.transactions || [],
    goals: d.goals || [],
    budgets: d.budgets || {},
    settings: { ...DEFAULTS, ...(d.settings || {}) },
    deleted: d.deleted || {},
  });

  const reload = async () => {
    const r = await storage.get("budget");
    if (r?.value) applyData(JSON.parse(r.value));
  };

  useEffect(() => {
    onRemoteUpdate(applyData); // samenvoegingen op afstand verschijnen vanzelf
    (async () => {
      try { await reload(); } catch (e) { console.error(e); }
      setLoading(false);
    })();
    const syncId = startSync(15000);
    return () => stopSync(syncId);
  }, []);

  // Sla de volledige status op (storage-adapter regelt versie-controle + merge).
  const persist = async (next) => {
    setData(next);
    try { await storage.set("budget", JSON.stringify(next)); }
    catch (e) { console.error(e); toast(e.message || "Opslaan mislukt"); }
  };

  // ----- afgeleide lijsten (tombstones eruit) -----
  const liveTx = useMemo(() => data.transactions.filter((x) => !data.deleted?.[x.id]), [data.transactions, data.deleted]);
  const liveGoals = useMemo(() => data.goals.filter((g) => !data.deleted?.[g.id]), [data.goals, data.deleted]);
  const inScope = (x) => scope === "alles" || x.scope === scope;
  const scopedTx = useMemo(() => liveTx.filter(inScope), [liveTx, scope]);

  // ----- handlers transacties -----
  const saveTx = (tx) => {
    const exists = data.transactions.some((x) => x.id === tx.id);
    const transactions = exists
      ? data.transactions.map((x) => (x.id === tx.id ? tx : x))
      : [...data.transactions, tx];
    persist({ ...data, transactions });
    setTxModal(null);
    toast(exists ? "Transactie bijgewerkt." : "Transactie toegevoegd.");
  };
  const delTx = (id) => {
    persist({ ...data, transactions: data.transactions.filter((x) => x.id !== id), deleted: { ...data.deleted, [id]: new Date().toISOString() } });
    toast("Transactie verwijderd.");
  };

  // ----- handlers doelen -----
  const saveGoal = (g) => {
    const exists = data.goals.some((x) => x.id === g.id);
    const goals = exists ? data.goals.map((x) => (x.id === g.id ? g : x)) : [...data.goals, g];
    persist({ ...data, goals });
    setGoalModal(null);
    toast(exists ? "Doel bijgewerkt." : "Doel toegevoegd.");
  };
  const delGoal = (id) => {
    persist({ ...data, goals: data.goals.filter((x) => x.id !== id), deleted: { ...data.deleted, [id]: new Date().toISOString() } });
    toast("Doel verwijderd.");
  };
  const addToGoal = (id, amount) => {
    persist({ ...data, goals: data.goals.map((g) => (g.id === id ? { ...g, saved: (g.saved || 0) + amount } : g)) });
    setTopUp(null);
    toast(`${eur(amount)} ingelegd.`);
  };

  // ----- budget -----
  const saveBudgets = (next) => { persist({ ...data, budgets: next }); setBudgetModal(false); toast("Budgetten opgeslagen."); };

  // ----- instellingen -----
  const updateSettings = (patch) => persist({ ...data, settings: { ...data.settings, ...patch } });
  const importTransactions = (incoming) => { persist({ ...data, transactions: [...data.transactions, ...incoming] }); toast(`${incoming.length} transacties geïmporteerd.`); };
  const resetAll = () => {
    if (!confirm("Weet je het zeker? Alle transacties, doelen en budgetten worden gewist.")) return;
    persist({ transactions: [], goals: [], budgets: {}, settings: { ...DEFAULTS }, deleted: {} });
    toast("Alle gegevens gewist.");
  };

  // ----- vaste lasten boeken (SPEC §10.6) -----
  const bookRecurring = () => {
    const seen = new Set(); const templates = [];
    for (const t of liveTx.filter((x) => x.recurring)) {
      const sig = `${t.type}|${t.scope}|${t.category}|${t.description}|${t.amount}`;
      if (!seen.has(sig)) { seen.add(sig); templates.push({ t, sig }); }
    }
    const { y, m } = month; const added = [];
    for (const { t, sig } of templates) {
      const already = liveTx.some((x) => {
        const d = new Date(x.date);
        return d.getUTCFullYear() === y && d.getUTCMonth() === m && `${x.type}|${x.scope}|${x.category}|${x.description}|${x.amount}` === sig;
      });
      if (already) continue;
      const day = Math.min(new Date(t.date).getUTCDate() || 1, 28);
      added.push({ ...t, id: uid(), date: new Date(Date.UTC(y, m, day)).toISOString(), recurring: true });
    }
    if (added.length) { persist({ ...data, transactions: [...data.transactions, ...added] }); toast(`${added.length} vaste last(en) geboekt voor ${MONTHS_NL[m]}.`); }
    else toast("Vaste lasten staan al geboekt voor deze maand.");
  };

  if (loading) return <p style={{ padding: 40, fontFamily: "system-ui", color: "#7A7E73" }}>Laden…</p>;

  const defaultScope = scope === "alles" ? "prive" : scope;
  const greeting = (() => { const h = new Date().getHours(); return h < 6 ? "Goedenacht" : h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond"; })();

  return (
    <div className="bb">
      <Style />

      {/* Bovenbalk */}
      <header className="topbar">
        <div>
          <div className="greet">{greeting}</div>
          <div className="date">{new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        <button className="iconbtn" onClick={() => setSettingsOpen(true)} aria-label="Instellingen"><Settings size={20} /></button>
      </header>

      {/* Scope-filter */}
      <div className="scopebar">
        {[["alles", "Alles", Layers], ["prive", "Privé", Home], ["zakelijk", "Zakelijk", Briefcase]].map(([v, label, Icon]) => (
          <button key={v} className={`scopebtn${scope === v ? " on" : ""}${v === "zakelijk" && scope === v ? " biz" : ""}`} onClick={() => setScope(v)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <main className="content">
        {tab === "overzicht" && <Dashboard {...{ scopedTx, liveTx, liveGoals, scope, month, setMonth, settings: data.settings, budgets: data.budgets, setTab }} />}
        {tab === "transacties" && <Transactions {...{ scopedTx, onEdit: (t) => setTxModal({ initial: t }), onDelete: delTx, onBook: bookRecurring, onCsv: () => setCsvOpen(true) }} />}
        {tab === "budget" && <BudgetTab {...{ budgets: data.budgets, scopedTx, scope, month, onEdit: () => setBudgetModal(true) }} />}
        {tab === "forecast" && <Forecast {...{ scopedTx }} />}
        {tab === "doelen" && <Goals {...{ liveGoals, scope, onAdd: () => setGoalModal({}), onEdit: (g) => setGoalModal(g), onTopUp: (g) => setTopUp(g), onDelete: delGoal }} />}
      </main>

      {/* FAB */}
      <button className="fab" onClick={() => setTxModal({ initial: null })} aria-label="Transactie toevoegen"><Plus size={26} /></button>

      {/* Tabbalk */}
      <nav className="tabs">
        {[["overzicht", "Overzicht", Wallet], ["transacties", "Transacties", Layers], ["budget", "Budget", PiggyBank], ["forecast", "Prognose", TrendingUp], ["doelen", "Doelen", Target]].map(([v, label, Icon]) => (
          <button key={v} className={`tab${tab === v ? " on" : ""}`} onClick={() => setTab(v)}>
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      {txModal && <TxModal initial={txModal.initial} defaultScope={defaultScope} onSave={saveTx} onClose={() => setTxModal(null)} />}
      {goalModal && <GoalModal initial={goalModal.id ? goalModal : null} defaultScope={defaultScope} onSave={saveGoal} onClose={() => setGoalModal(null)} />}
      {topUp && <TopUpModal goal={topUp} onSave={(amt) => addToGoal(topUp.id, amt)} onClose={() => setTopUp(null)} />}
      {budgetModal && <BudgetModal budgets={data.budgets} scope={scope} onSave={saveBudgets} onClose={() => setBudgetModal(false)} />}
      {settingsOpen && (
        <SettingsModal
          settings={data.settings} data={data}
          onUpdate={updateSettings} onClose={() => setSettingsOpen(false)}
          onShare={() => { setSettingsOpen(false); setHhOpen(true); }}
          onImportData={(d) => { persist({ transactions: d.transactions || [], goals: d.goals || [], budgets: d.budgets || {}, settings: { ...DEFAULTS, ...(d.settings || {}) }, deleted: d.deleted || {} }); toast("Back-up geïmporteerd."); }}
          onReset={resetAll} onLogout={onLogout}
        />
      )}
      {hhOpen && <Household onClose={() => setHhOpen(false)} onChanged={() => { reload(); toast("Huishouden gewijzigd — data herladen."); }} />}
      {csvOpen && <CsvImport existing={data.transactions} onImport={importTransactions} onClose={() => setCsvOpen(false)} />}

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

// --------------------------------------------------------------------- Dashboard
function Dashboard({ scopedTx, liveTx, liveGoals, scope, month, setMonth, settings, budgets, setTab }) {
  const { y, m } = month;
  const now = new Date();
  const atCurrent = y === now.getFullYear() && m === now.getMonth();

  const inMonth = (list, yy, mm) => list.filter((t) => { const d = new Date(t.date); return d.getUTCFullYear() === yy && d.getUTCMonth() === mm; });
  const total = scopedTx.reduce((s, t) => s + signed(t), 0);

  const monthTx = inMonth(scopedTx, y, m);
  const income = monthTx.filter((t) => t.type === "inkomst").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "uitgave").reduce((s, t) => s + t.amount, 0);
  const result = income - expense;
  const pm = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
  const prevExpense = inMonth(scopedTx, pm.y, pm.m).filter((t) => t.type === "uitgave").reduce((s, t) => s + t.amount, 0);

  // reservering (SPEC §10.7) — altijd op basis van zakelijke posten van dit kalenderjaar
  const yr = now.getFullYear();
  const bizYear = liveTx.filter((t) => t.scope === "zakelijk" && new Date(t.date).getUTCFullYear() === yr);
  const winst = Math.max(0, bizYear.filter((t) => t.type === "inkomst").reduce((s, t) => s + t.amount, 0) - bizYear.filter((t) => t.type === "uitgave").reduce((s, t) => s + t.amount, 0));
  const reservering = Math.round(winst * (settings.reservePct || 0) / 100);
  const besteedbaar = total - reservering;

  // grootste uitgaven top 5
  const byCat = {};
  monthTx.filter((t) => t.type === "uitgave").forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // inzichten (SPEC §10.8, max 4)
  const insights = [];
  if (result < 0) insights.push({ type: "warn", text: `Je geeft deze maand ${eur(-result)} meer uit dan er binnenkomt.` });
  if (prevExpense > 0) {
    const diff = Math.round((expense - prevExpense) / prevExpense * 100);
    if (Math.abs(diff) >= 8) insights.push({ type: diff > 0 ? "warn" : "good", text: `Je uitgaven liggen ${Math.abs(diff)}% ${diff > 0 ? "hoger" : "lager"} dan vorige maand.` });
  }
  if (result > 0 && income > 0) insights.push({ type: "good", text: `Je spaarde ${Math.round(result / income * 100)}% van je inkomsten deze maand.` });
  for (const [key, lim] of Object.entries(budgets || {})) {
    const [sc, cat] = key.split("::");
    if (scope !== "alles" && sc !== scope) continue;
    const spent = monthTx.filter((t) => t.type === "uitgave" && t.scope === sc && t.category === cat).reduce((s, t) => s + t.amount, 0);
    if (lim > 0 && spent > lim) insights.push({ type: "warn", text: `Over budget bij ${cat}: ${eur(spent - lim)} te veel.` });
  }
  const shownInsights = insights.slice(0, 4);

  const goalsMini = liveGoals.filter((g) => scope === "alles" || g.scope === scope).slice(0, 3);

  return (
    <>
      {/* maandnavigatie */}
      <div className="monthnav">
        <button onClick={() => setMonth(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })} aria-label="Vorige maand">‹</button>
        <span>{MONTHS_NL[m]} {y}</span>
        <button disabled={atCurrent} onClick={() => !atCurrent && setMonth(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })} aria-label="Volgende maand">›</button>
      </div>

      {/* totaal saldo */}
      <div className="card hero">
        <div className="lbl">Totaal saldo</div>
        <div className={`bignum ${total < 0 ? "neg" : ""}`}>{eur(total)}</div>
        {settings.reserveOn && reservering > 0 && (
          <div className="sub">Besteedbaar na reservering: <strong>{eur(besteedbaar)}</strong></div>
        )}
      </div>

      {/* inzichten */}
      {shownInsights.length > 0 && (
        <div className="card insights">
          <div className="lbl"><Lightbulb size={14} /> Inzichten</div>
          {shownInsights.map((i, k) => (
            <div key={k} className={`insight ${i.type}`}>
              {i.type === "warn" ? <AlertTriangle size={15} /> : <TrendingUp size={15} />}<span>{i.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* in/uit kaarten */}
      <div className="grid2">
        <div className="card stat">
          <div className="lbl"><ArrowUpRight size={14} /> Inkomsten</div>
          <div className="num pos">{eur(income)}</div>
        </div>
        <div className="card stat">
          <div className="lbl"><ArrowDownRight size={14} /> Uitgaven</div>
          <div className="num neg">{eur(expense)}</div>
        </div>
      </div>

      {/* resultaat */}
      <div className="card">
        <div className="lbl">Resultaat deze maand</div>
        <div className={`num ${result >= 0 ? "pos" : "neg"}`} style={{ fontSize: 26 }}>{result >= 0 ? "+" : ""}{eur(result)}</div>
        <div className="muted small">Uitgaven vorige maand: {eur(prevExpense)}</div>
      </div>

      {/* reservering */}
      {settings.reserveOn && reservering > 0 && (
        <div className="card reserve">
          <div className="lbl"><ShieldAlert size={14} /> Reservering belasting & BTW</div>
          <div className="num gold" style={{ fontSize: 24 }}>{eur(reservering)}</div>
          <div className="muted small">{settings.reservePct}% van je zakelijke winst dit jaar ({eur(winst)}). Indicatie, geen fiscaal advies.</div>
        </div>
      )}

      {/* grootste uitgaven */}
      {topCats.length > 0 && (
        <div className="card">
          <div className="lbl">Grootste uitgaven</div>
          {topCats.map(([cat, amt]) => (
            <div key={cat} className="barrow">
              <div className="barhead"><span>{cat}</span><span>{eur(amt)}</span></div>
              <div className="bar"><div className="fill" style={{ width: `${expense ? Math.round(amt / expense * 100) : 0}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      {/* spaardoelen mini */}
      {goalsMini.length > 0 && (
        <div className="card">
          <div className="lbl" style={{ display: "flex", justifyContent: "space-between" }}>
            <span><Target size={14} style={{ verticalAlign: -2 }} /> Spaardoelen</span>
            <button className="link" onClick={() => setTab("doelen")}>Bekijk alle</button>
          </div>
          {goalsMini.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.saved || 0) / g.target * 100)) : 0;
            return (
              <div key={g.id} className="barrow">
                <div className="barhead"><span>{g.name}</span><span>{eur(g.saved || 0)} / {eur(g.target)}</span></div>
                <div className="bar"><div className="fill green" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// --------------------------------------------------------------------- Transacties
function Transactions({ scopedTx, onEdit, onDelete, onBook, onCsv }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("alles"); // alles | inkomst | uitgave

  const list = useMemo(() => {
    let l = [...scopedTx];
    if (filter !== "alles") l = l.filter((t) => t.type === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter((t) => (t.description || "").toLowerCase().includes(s) || (t.category || "").toLowerCase().includes(s));
    }
    return l.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [scopedTx, q, filter]);

  // groeperen per maand
  const groups = useMemo(() => {
    const g = {};
    for (const t of list) { const d = new Date(t.date); const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`; (g[key] = g[key] || []).push(t); }
    return Object.entries(g).sort((a, b) => {
      const [ay, am] = a[0].split("-").map(Number); const [by, bm] = b[0].split("-").map(Number);
      return by - ay || bm - am;
    });
  }, [list]);

  return (
    <>
      <div className="searchrow">
        <div className="searchbox"><Search size={16} /><input placeholder="Zoek omschrijving of categorie" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="segrow">
        <div className="seg small">
          {[["alles", "Alles"], ["inkomst", "In"], ["uitgave", "Uit"]].map(([v, l]) => (
            <button key={v} className={filter === v ? "on" : ""} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <div className="actrow">
          <button className="btn ghost" onClick={onBook}><Repeat size={14} /> Vaste lasten</button>
          <button className="btn ghost" onClick={onCsv}><Upload size={14} /> Importeer CSV</button>
        </div>
      </div>

      {groups.length === 0 && <p className="empty">Nog geen transacties. Tik op + om er een toe te voegen.</p>}

      {groups.map(([key, items]) => {
        const [yy, mm] = key.split("-").map(Number);
        return (
          <div key={key} className="txgroup">
            <div className="txmonth">{MONTHS_NL[mm]} {yy}</div>
            {items.map((t) => (
              <div key={t.id} className="txrow" onClick={() => onEdit(t)}>
                <div className={`txicon ${t.type}`}>{t.type === "inkomst" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</div>
                <div className="txmain">
                  <div className="txdesc">
                    {t.description || t.category}
                    {t.recurring && <span className="pill">mnd</span>}
                    {t.reminder?.enabled && <span className="pill bell"><Bell size={10} /></span>}
                  </div>
                  <div className="txmeta">{t.category} · {t.scope === "zakelijk" ? "Zakelijk" : "Privé"} · {new Date(t.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</div>
                </div>
                <div className={`txamt ${t.type === "inkomst" ? "pos" : "neg"}`}>{t.type === "inkomst" ? "+" : "−"}{eur2(t.amount)}</div>
                <button className="txdel" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} aria-label="Verwijderen"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

// --------------------------------------------------------------------- Budget
function BudgetTab({ budgets, scopedTx, scope, month, onEdit }) {
  const { y, m } = month;
  const entries = Object.entries(budgets || {}).filter(([key]) => { const [sc] = key.split("::"); return scope === "alles" || sc === scope; });
  const spentOf = (sc, cat) => scopedTx.filter((t) => { const d = new Date(t.date); return t.type === "uitgave" && t.scope === sc && t.category === cat && d.getUTCFullYear() === y && d.getUTCMonth() === m; }).reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <div className="tabhead">
        <h2>Budgetten <span className="muted small">· {MONTHS_NL[m]}</span></h2>
        <button className="btn green" onClick={onEdit}>Instellen</button>
      </div>
      {entries.length === 0 && <p className="empty">Nog geen budgetlimieten. Tik op "Instellen" om maandlimieten per categorie te zetten.</p>}
      {entries.map(([key, lim]) => {
        const [sc, cat] = key.split("::");
        const spent = spentOf(sc, cat);
        const pct = lim > 0 ? Math.round(spent / lim * 100) : 0;
        const over = spent > lim;
        const warn = pct >= 80 && !over;
        return (
          <div key={key} className="card budgetcard">
            <div className="barhead">
              <span>{cat} <span className="muted small">{sc === "zakelijk" ? "· Zakelijk" : "· Privé"}</span></span>
              <span>{eur(spent)} / {eur(lim)}</span>
            </div>
            <div className="bar"><div className={`fill ${over ? "red" : warn ? "gold" : "green"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
            {over && <div className="overlbl">{eur(spent - lim)} over budget</div>}
          </div>
        );
      })}
    </>
  );
}

// --------------------------------------------------------------------- Forecast
function Forecast({ scopedTx }) {
  const now = new Date();
  const monthNet = (yy, mm) => scopedTx.filter((t) => { const d = new Date(t.date); return d.getUTCFullYear() === yy && d.getUTCMonth() === mm; }).reduce((s, t) => s + signed(t), 0);

  const recurNet = scopedTx.filter((t) => t.recurring).reduce((s, t) => s + signed(t), 0);
  // gemiddeld netto van de laatste 3 (afgelopen) maanden
  let l3 = 0;
  for (let i = 1; i <= 3; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); l3 += monthNet(d.getFullYear(), d.getMonth()); }
  const last3avg = l3 / 3;
  const monthlyEst = Math.round((recurNet + last3avg) / 2);

  const total = scopedTx.reduce((s, t) => s + signed(t), 0);

  // 6 maanden historie (werkelijk) + 6 maanden prognose
  const points = [];
  const actualNets = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); actualNets.push({ d, net: monthNet(d.getFullYear(), d.getMonth()) }); }
  // balans aan het eind van elke maand: huidige maand = total; eerdere maanden terugrekenen
  const balances = new Array(6);
  balances[5] = total;
  for (let i = 4; i >= 0; i--) balances[i] = balances[i + 1] - actualNets[i + 1].net;
  actualNets.forEach((a, i) => points.push({ label: MONTHS_SHORT[a.d.getMonth()], werkelijk: Math.round(balances[i]), prognose: i === 5 ? Math.round(balances[i]) : null }));
  // prognose vooruit
  let bal = total;
  for (let i = 1; i <= 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); bal += monthlyEst; points.push({ label: MONTHS_SHORT[d.getMonth()], werkelijk: null, prognose: Math.round(bal) }); }

  const projected = Math.round(total + monthlyEst * 6);

  return (
    <>
      <div className="card hero">
        <div className="lbl">Verwacht saldo over 6 maanden</div>
        <div className={`bignum ${projected < 0 ? "neg" : ""}`}>{eur(projected)}</div>
        <div className="sub">Geschat maandresultaat: <strong className={monthlyEst >= 0 ? "pos" : "neg"}>{monthlyEst >= 0 ? "+" : ""}{eur(monthlyEst)}</strong></div>
      </div>
      <div className="card">
        <div className="lbl">Werkelijk vs. prognose</div>
        <div style={{ width: "100%", height: 220, marginTop: 8 }}>
          <ResponsiveContainer>
            <AreaChart data={points} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1F5A47" stopOpacity={0.32} /><stop offset="100%" stopColor="#1F5A47" stopOpacity={0} /></linearGradient>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C29B3E" stopOpacity={0.25} /><stop offset="100%" stopColor="#C29B3E" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E1D4" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A7E73" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7A7E73" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => eur(v)} />
              <Tooltip formatter={(v) => eur(v)} labelStyle={{ color: "#1E2B25" }} contentStyle={{ borderRadius: 12, border: "1px solid #E6E1D4", fontFamily: "Hanken Grotesk, sans-serif" }} />
              <Area type="monotone" dataKey="werkelijk" stroke="#1F5A47" strokeWidth={2} fill="url(#gW)" connectNulls name="Werkelijk" />
              <Area type="monotone" dataKey="prognose" stroke="#C29B3E" strokeWidth={2} strokeDasharray="5 4" fill="url(#gP)" connectNulls name="Prognose" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="legend"><span><i className="dot green" /> Werkelijk</span><span><i className="dot gold" /> Prognose</span></div>
      </div>
    </>
  );
}

// --------------------------------------------------------------------- Doelen
function Goals({ liveGoals, scope, onAdd, onEdit, onTopUp, onDelete }) {
  const goals = liveGoals.filter((g) => scope === "alles" || g.scope === scope);
  const monthsUntil = (deadline) => {
    if (!deadline) return null;
    const d = new Date(deadline + "T00:00:00Z"); const now = new Date();
    const months = (d.getUTCFullYear() - now.getFullYear()) * 12 + (d.getUTCMonth() - now.getMonth());
    return Math.max(1, months);
  };

  return (
    <>
      <div className="tabhead"><h2>Spaardoelen</h2><button className="btn green" onClick={onAdd}><Plus size={15} /> Nieuw doel</button></div>
      {goals.length === 0 && <p className="empty">Nog geen doelen. Tik op "Nieuw doel" om te beginnen met sparen.</p>}
      {goals.map((g) => {
        const saved = g.saved || 0;
        const pct = g.target > 0 ? Math.min(100, Math.round(saved / g.target * 100)) : 0;
        const rest = Math.max(0, g.target - saved);
        const done = saved >= g.target && g.target > 0;
        const ml = monthsUntil(g.deadline);
        const needed = ml ? Math.ceil(rest / ml) : null;
        return (
          <div key={g.id} className="card goalcard">
            <div className="ring" style={{ background: `conic-gradient(${done ? "#2E7D5B" : "#1F5A47"} ${pct * 3.6}deg, #E6E1D4 0)` }}>
              <div className="ringinner">{pct}%</div>
            </div>
            <div className="goalbody">
              <div className="goalname">{g.name} <span className="muted small">{g.scope === "zakelijk" ? "· Zakelijk" : "· Privé"}</span></div>
              <div className="goalamt">{eur(saved)} <span className="muted">/ {eur(g.target)}</span></div>
              <div className="muted small">{done ? "🎉 Doel behaald!" : `Nog ${eur(rest)} te gaan`}{needed != null && !done && ` · ${eur(needed)}/mnd tot ${new Date(g.deadline + "T00:00:00Z").toLocaleDateString("nl-NL", { month: "short", year: "numeric" })}`}</div>
              <div className="goalbtns">
                <button className="btn green small" onClick={() => onTopUp(g)}><Plus size={13} /> Inleg</button>
                <button className="btn ghost small" onClick={() => onEdit(g)}>Bewerk</button>
                <button className="btn ghost small danger" onClick={() => onDelete(g.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// --------------------------------------------------------------------- TxModal
function TxModal({ initial, defaultScope, onSave, onClose }) {
  const [type, setType] = useState(initial?.type || "uitgave");
  const [sc, setSc] = useState(initial?.scope || defaultScope);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState(initial?.category || CATS[initial?.scope || defaultScope][initial?.type || "uitgave"][0]);
  const [description, setDescription] = useState(initial?.description || "");
  const [date, setDate] = useState(initial ? isoDay(initial.date) : new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState(initial?.recurring || false);
  const [remind, setRemind] = useState(initial?.reminder?.enabled || false);
  const [daysBefore, setDaysBefore] = useState(initial?.reminder?.daysBefore ?? 3);

  const cats = CATS[sc][type];
  useEffect(() => { if (!cats.includes(category)) setCategory(cats[0]); }, [sc, type]); // reset categorie bij scope/type-wissel

  const reminderDate = () => { const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - (parseInt(daysBefore) || 0)); return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" }); };

  const save = () => {
    const amt = parseFloat(String(amount).replace(",", "."));
    if (!amt || amt <= 0) return;
    onSave({
      id: initial?.id || uid(), type, scope: sc, amount: Math.abs(amt), category,
      date: dateToISO(date), description: description.trim(), recurring,
      reminder: remind ? { enabled: true, daysBefore: Math.max(0, parseInt(daysBefore) || 0) } : { enabled: false },
    });
  };

  return (
    <Sheet title={initial ? "Transactie bewerken" : "Nieuwe transactie"} onClose={onClose}>
      <div className="seg">
        <button className={type === "uitgave" ? "on" : ""} onClick={() => setType("uitgave")}>Uitgave</button>
        <button className={type === "inkomst" ? "on" : ""} onClick={() => setType("inkomst")}>Inkomst</button>
      </div>
      <div className="seg">
        <button className={sc === "prive" ? "on" : ""} onClick={() => setSc("prive")}><Home size={14} /> Privé</button>
        <button className={sc === "zakelijk" ? "on biz" : ""} onClick={() => setSc("zakelijk")}><Briefcase size={14} /> Zakelijk</button>
      </div>
      <label className="fld"><span>Bedrag</span><input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></label>
      <label className="fld"><span>Categorie</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
      </label>
      <label className="fld"><span>Omschrijving</span><input type="text" placeholder="Bijv. Huur, Boodschappen…" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <div className="fld"><span>Datum</span><DatePicker value={date} onChange={setDate} /></div>
      <button type="button" className={recurring ? "toggle on" : "toggle"} onClick={() => setRecurring(!recurring)}>
        <Repeat size={15} /> Maandelijks terugkerend {recurring && <Check size={15} style={{ marginLeft: "auto" }} />}
      </button>
      <button type="button" className={remind ? "toggle on" : "toggle"} onClick={() => setRemind(!remind)}>
        {remind ? <BellRing size={15} /> : <Bell size={15} />} Herinnering {remind && <Check size={15} style={{ marginLeft: "auto" }} />}
      </button>
      {remind && (
        <>
          <label className="fld"><span>Aantal dagen van tevoren</span>
            <input type="number" min="0" max="60" inputMode="numeric" value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} />
          </label>
          <p className="muted small" style={{ marginTop: -4 }}>Je krijgt een melding op {reminderDate()}.</p>
        </>
      )}
      <button className="btn green full big" onClick={save} disabled={!amount || parseFloat(String(amount).replace(",", ".")) <= 0}>{initial ? "Opslaan" : "Toevoegen"}</button>
    </Sheet>
  );
}

// --------------------------------------------------------------------- GoalModal
function GoalModal({ initial, defaultScope, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [target, setTarget] = useState(initial ? String(initial.target) : "");
  const [saved, setSaved] = useState(initial ? String(initial.saved || 0) : "0");
  const [sc, setSc] = useState(initial?.scope || defaultScope);
  const [deadline, setDeadline] = useState(initial?.deadline || "");

  const save = () => {
    const t = parseFloat(String(target).replace(",", "."));
    if (!name.trim() || !t || t <= 0) return;
    onSave({ id: initial?.id || uid(), name: name.trim(), target: Math.abs(t), saved: Math.max(0, parseFloat(String(saved).replace(",", ".")) || 0), scope: sc, deadline: deadline || "" });
  };

  return (
    <Sheet title={initial ? "Doel bewerken" : "Nieuw spaardoel"} onClose={onClose}>
      <label className="fld"><span>Naam</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Buffer, Vakantie" autoFocus /></label>
      <label className="fld"><span>Doelbedrag</span><input type="number" inputMode="decimal" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" /></label>
      <label className="fld"><span>Al gespaard</span><input type="number" inputMode="decimal" min="0" value={saved} onChange={(e) => setSaved(e.target.value)} /></label>
      <div className="seg">
        <button className={sc === "prive" ? "on" : ""} onClick={() => setSc("prive")}><Home size={14} /> Privé</button>
        <button className={sc === "zakelijk" ? "on biz" : ""} onClick={() => setSc("zakelijk")}><Briefcase size={14} /> Zakelijk</button>
      </div>
      <div className="fld"><span>Streefdatum (optioneel)</span><DatePicker value={deadline} onChange={setDeadline} /></div>
      <button className="btn green full big" onClick={save} disabled={!name.trim() || !target}>Opslaan</button>
    </Sheet>
  );
}

// --------------------------------------------------------------------- TopUpModal
function TopUpModal({ goal, onSave, onClose }) {
  const [amount, setAmount] = useState("");
  const save = () => { const a = parseFloat(String(amount).replace(",", ".")); if (!a || a <= 0) return; onSave(Math.abs(a)); };
  return (
    <Sheet title={`Inleg — ${goal.name}`} onClose={onClose}>
      <p className="muted small">Huidig gespaard: {eur(goal.saved || 0)} van {eur(goal.target)}.</p>
      <label className="fld"><span>Bedrag toevoegen</span><input type="number" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" autoFocus /></label>
      <button className="btn green full big" onClick={save} disabled={!amount}>Toevoegen</button>
    </Sheet>
  );
}

// --------------------------------------------------------------------- BudgetModal
function BudgetModal({ budgets, scope, onSave, onClose }) {
  const scopes = scope === "alles" ? ["prive", "zakelijk"] : [scope];
  const [vals, setVals] = useState(() => {
    const o = {};
    for (const sc of scopes) for (const cat of CATS[sc].uitgave) { const k = `${sc}::${cat}`; o[k] = budgets[k] != null ? String(budgets[k]) : ""; }
    return o;
  });
  const save = () => {
    const next = { ...budgets };
    for (const [k, v] of Object.entries(vals)) {
      const n = parseFloat(String(v).replace(",", "."));
      if (v === "" || isNaN(n) || n <= 0) delete next[k]; else next[k] = Math.round(n);
    }
    onSave(next);
  };
  return (
    <Sheet title="Maandlimieten" onClose={onClose}>
      <p className="muted small">Laat leeg voor geen limiet. Sleutel = scope · categorie.</p>
      {scopes.map((sc) => (
        <div key={sc}>
          <div className="lbl" style={{ marginTop: 10 }}>{sc === "zakelijk" ? "Zakelijk" : "Privé"}</div>
          {CATS[sc].uitgave.map((cat) => (
            <label key={cat} className="fld row"><span>{cat}</span>
              <input type="number" inputMode="decimal" min="0" placeholder="—" value={vals[`${sc}::${cat}`]} onChange={(e) => setVals((o) => ({ ...o, [`${sc}::${cat}`]: e.target.value }))} />
            </label>
          ))}
        </div>
      ))}
      <button className="btn green full big" onClick={save}>Opslaan</button>
    </Sheet>
  );
}

// --------------------------------------------------------------------- SettingsModal
function SettingsModal({ settings, data, onUpdate, onClose, onShare, onImportData, onReset, onLogout }) {
  const [pushState, setPushState] = useState({ supported: true, enabled: false, permission: "default" });
  useEffect(() => { push.status().then(setPushState).catch(() => setPushState({ supported: false, enabled: false, permission: "unsupported" })); }, []);

  const togglePush = async () => {
    try { if (pushState.enabled) await push.disable(); else await push.enable(); setPushState(await push.status()); }
    catch (e) { alert(e.message); }
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `budgetboek-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importBackup = (file) => {
    const r = new FileReader();
    r.onload = () => { try { onImportData(JSON.parse(r.result)); } catch { alert("Ongeldig back-upbestand."); } };
    r.readAsText(file);
  };

  const deleteAccount = async () => {
    if (!confirm("Account én alle gegevens permanent verwijderen?")) return;
    try { await api.deleteAccount(); onLogout(); } catch (e) { alert(e.message); }
  };

  return (
    <Sheet title="Instellingen" onClose={onClose}>
      {/* reservering */}
      <div className="lbl">Reservering belasting & BTW</div>
      <button className={settings.reserveOn ? "toggle on" : "toggle"} onClick={() => onUpdate({ reserveOn: !settings.reserveOn })}>
        <ShieldAlert size={15} /> Reservering tonen {settings.reserveOn && <Check size={15} style={{ marginLeft: "auto" }} />}
      </button>
      {settings.reserveOn && (
        <label className="fld"><span>Percentage van zakelijke winst</span>
          <input type="number" min="0" max="60" value={settings.reservePct} onChange={(e) => onUpdate({ reservePct: Math.min(60, Math.max(0, parseInt(e.target.value) || 0)) })} />
        </label>
      )}

      {/* push */}
      <div className="lbl" style={{ marginTop: 14 }}>Pushberichten</div>
      {pushState.supported ? (
        <>
          <button className={pushState.enabled ? "toggle on" : "toggle"} onClick={togglePush}>
            <Bell size={15} /> Pushberichten ontvangen {pushState.enabled && <Check size={15} style={{ marginLeft: "auto" }} />}
          </button>
          {pushState.enabled && <button className="btn ghost full" onClick={() => push.sendTest().catch((e) => alert(e.message))}>Stuur testmelding</button>}
          {pushState.permission === "denied" && <p className="muted small">Meldingen zijn in je browser geblokkeerd; zet ze daar weer aan om dit te gebruiken.</p>}
        </>
      ) : <p className="muted small">Deze browser ondersteunt geen pushberichten.</p>}

      {/* delen */}
      <div className="lbl" style={{ marginTop: 14 }}>Delen</div>
      <button className="btn ghost full" onClick={onShare}><Users size={15} /> Delen met partner</button>

      {/* back-up */}
      <div className="lbl" style={{ marginTop: 14 }}>Back-up</div>
      <div className="grid2">
        <button className="btn ghost" onClick={exportBackup}><Download size={15} /> Exporteren</button>
        <label className="btn ghost" style={{ cursor: "pointer" }}><Upload size={15} /> Importeren<input type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => e.target.files[0] && importBackup(e.target.files[0])} /></label>
      </div>

      {/* gevarenzone */}
      <div className="lbl" style={{ marginTop: 14 }}>Account</div>
      <button className="btn ghost full danger" onClick={onReset}><Trash2 size={15} /> Alle gegevens wissen</button>
      <button className="btn ghost full danger" onClick={deleteAccount}><ShieldAlert size={15} /> Account verwijderen</button>
      <button className="btn green full" style={{ marginTop: 6 }} onClick={onLogout}><LogOut size={15} /> Uitloggen</button>
    </Sheet>
  );
}

// --------------------------------------------------------------------- Sheet (bottom-sheet wrapper)
function Sheet({ title, onClose, children }) {
  return (
    <div className="ovl" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sh-h"><h3>{title}</h3><button className="xx" onClick={onClose}><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- Styles
function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
      :root{ --paper:#F3EFE6; --card:#FBFAF5; --ink:#1E2B25; --muted:#7A7E73; --green:#1F5A47; --green-d:#163b30; --gold:#C29B3E; --pos:#2E7D5B; --neg:#C24B33; --line:#E6E1D4; --biz:#2E6F8E; }
      *{ box-sizing:border-box; }
      .bb{ font-family:'Hanken Grotesk',sans-serif; color:var(--ink); background:var(--paper); background-image:radial-gradient(circle at 0% 0%, rgba(194,155,62,0.12), transparent 42%); min-height:100vh; max-width:560px; margin:0 auto; padding:0 16px 96px; position:relative; }
      .bb h2{ font-family:'Fraunces',serif; font-weight:500; font-size:21px; }
      .muted{ color:var(--muted); } .small{ font-size:12.5px; }
      .pos{ color:var(--pos); } .neg{ color:var(--neg); } .gold{ color:var(--gold); }
      .link{ background:none; border:none; color:var(--green); font-weight:600; font-family:inherit; cursor:pointer; font-size:13px; }

      .topbar{ display:flex; align-items:center; justify-content:space-between; padding:22px 2px 12px; }
      .greet{ font-family:'Fraunces',serif; font-size:22px; font-weight:500; }
      .date{ color:var(--muted); font-size:13px; text-transform:capitalize; }
      .iconbtn{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:10px; cursor:pointer; color:var(--ink); display:grid; place-items:center; }

      .scopebar{ display:flex; gap:6px; background:var(--card); border:1px solid var(--line); border-radius:13px; padding:4px; margin-bottom:14px; }
      .scopebtn{ flex:1; display:flex; align-items:center; justify-content:center; gap:5px; border:none; background:none; border-radius:10px; padding:9px 6px; font-family:inherit; font-size:13.5px; font-weight:600; color:var(--muted); cursor:pointer; transition:.15s; }
      .scopebtn.on{ background:var(--green); color:#fff; } .scopebtn.on.biz{ background:var(--biz); }

      .content{ display:flex; flex-direction:column; gap:12px; }
      .card{ background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px 17px; box-shadow:0 4px 18px rgba(30,43,37,0.04); }
      .lbl{ font-size:12px; font-weight:600; color:var(--muted); letter-spacing:.3px; display:flex; align-items:center; gap:6px; margin-bottom:6px; text-transform:uppercase; }
      .card .num{ font-family:'Fraunces',serif; font-size:20px; font-weight:500; }
      .hero .bignum{ font-family:'Fraunces',serif; font-size:38px; font-weight:500; letter-spacing:-1px; line-height:1.05; }
      .hero .bignum.neg{ color:var(--neg); }
      .hero .sub{ color:var(--muted); font-size:13.5px; margin-top:8px; }
      .grid2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .stat .num{ font-size:22px; }

      .monthnav{ display:flex; align-items:center; justify-content:center; gap:18px; margin-bottom:2px; }
      .monthnav span{ font-family:'Fraunces',serif; font-size:16px; text-transform:capitalize; min-width:120px; text-align:center; }
      .monthnav button{ background:var(--card); border:1px solid var(--line); width:34px; height:34px; border-radius:10px; font-size:18px; color:var(--green); cursor:pointer; }
      .monthnav button:disabled{ opacity:.35; cursor:default; }

      .insights{ display:flex; flex-direction:column; gap:8px; }
      .insight{ display:flex; gap:8px; align-items:flex-start; font-size:13.5px; line-height:1.35; padding:9px 11px; border-radius:11px; }
      .insight svg{ flex-shrink:0; margin-top:1px; }
      .insight.warn{ background:rgba(194,75,51,0.08); color:var(--neg); }
      .insight.good{ background:rgba(46,125,91,0.09); color:var(--pos); }

      .barrow{ margin:10px 0 2px; }
      .barhead{ display:flex; justify-content:space-between; font-size:13.5px; font-weight:600; margin-bottom:5px; }
      .bar{ height:8px; background:var(--paper); border-radius:6px; overflow:hidden; }
      .bar .fill{ height:100%; background:var(--gold); border-radius:6px; }
      .bar .fill.green{ background:var(--green); } .bar .fill.gold{ background:var(--gold); } .bar .fill.red{ background:var(--neg); }
      .overlbl{ color:var(--neg); font-size:12.5px; font-weight:600; margin-top:6px; }
      .budgetcard{ padding:13px 15px; }

      .tabhead{ display:flex; align-items:center; justify-content:space-between; margin:2px 0; }
      .empty{ color:var(--muted); text-align:center; padding:34px 16px; font-size:14px; }

      .searchbox{ display:flex; align-items:center; gap:8px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:10px 13px; }
      .searchbox svg{ color:var(--muted); } .searchbox input{ border:none; background:none; outline:none; font-family:inherit; font-size:14.5px; width:100%; color:var(--ink); }
      .segrow{ display:flex; flex-direction:column; gap:10px; }
      .seg{ display:flex; gap:5px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:4px; }
      .seg button{ flex:1; border:none; background:none; border-radius:9px; padding:11px 8px; font-family:inherit; font-size:14px; font-weight:600; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }
      .seg button.on{ background:var(--green); color:#fff; } .seg button.on.biz{ background:var(--biz); }
      .seg.small button{ padding:8px 6px; font-size:13px; }
      .actrow{ display:flex; gap:8px; } .actrow .btn{ flex:1; }

      .txmonth{ font-family:'Fraunces',serif; font-size:14px; color:var(--muted); text-transform:capitalize; margin:14px 2px 6px; }
      .txrow{ display:flex; align-items:center; gap:11px; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:11px 13px; margin-bottom:8px; cursor:pointer; }
      .txrow:hover{ border-color:var(--green); }
      .txicon{ width:34px; height:34px; border-radius:10px; display:grid; place-items:center; flex-shrink:0; }
      .txicon.inkomst{ background:rgba(46,125,91,0.12); color:var(--pos); } .txicon.uitgave{ background:rgba(194,75,51,0.1); color:var(--neg); }
      .txmain{ flex:1; min-width:0; } .txdesc{ font-weight:600; font-size:14.5px; display:flex; align-items:center; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .txmeta{ color:var(--muted); font-size:12px; margin-top:2px; }
      .pill{ font-size:10px; font-weight:700; background:var(--paper); border:1px solid var(--line); color:var(--muted); border-radius:20px; padding:1px 7px; text-transform:uppercase; }
      .pill.bell{ display:inline-flex; align-items:center; padding:2px 5px; color:var(--gold); }
      .txamt{ font-family:'Fraunces',serif; font-size:15.5px; white-space:nowrap; }
      .txdel{ background:none; border:none; color:#cfc8b8; cursor:pointer; padding:5px; display:grid; place-items:center; } .txdel:hover{ color:var(--neg); }

      .goalcard{ display:flex; gap:15px; align-items:center; }
      .ring{ width:64px; height:64px; border-radius:50%; flex-shrink:0; display:grid; place-items:center; }
      .ringinner{ width:48px; height:48px; border-radius:50%; background:var(--card); display:grid; place-items:center; font-family:'Fraunces',serif; font-size:14px; font-weight:600; }
      .goalbody{ flex:1; min-width:0; } .goalname{ font-weight:600; font-size:15px; } .goalamt{ font-family:'Fraunces',serif; font-size:17px; margin:2px 0; }
      .goalbtns{ display:flex; gap:7px; margin-top:9px; }

      .legend{ display:flex; gap:16px; justify-content:center; font-size:12px; color:var(--muted); margin-top:6px; }
      .legend .dot{ display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:5px; }
      .dot.green{ background:var(--green); } .dot.gold{ background:var(--gold); }

      .btn{ border:1px solid var(--line); background:var(--card); color:var(--ink); border-radius:11px; padding:10px 13px; font-family:inherit; font-size:13.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:.15s; }
      .btn:hover{ border-color:var(--green); } .btn.green{ background:var(--green); color:#fff; border-color:var(--green); } .btn.green:hover{ background:var(--green-d); }
      .btn.full{ width:100%; } .btn.big{ padding:13px; font-size:15px; margin-top:8px; } .btn.small{ padding:7px 11px; font-size:12.5px; }
      .btn.danger{ color:var(--neg); } .btn.danger:hover{ border-color:var(--neg); }
      .btn:disabled{ opacity:.5; cursor:default; }

      .fab{ position:fixed; right:max(16px, calc(50vw - 280px + 16px)); bottom:80px; width:58px; height:58px; border-radius:50%; border:none; background:var(--green); color:#fff; box-shadow:0 8px 24px rgba(31,90,71,0.4); cursor:pointer; display:grid; place-items:center; z-index:50; }
      .fab:hover{ background:var(--green-d); }

      .tabs{ position:fixed; bottom:0; left:0; right:0; background:var(--card); border-top:1px solid var(--line); display:flex; justify-content:center; gap:2px; padding:8px max(8px, calc(50vw - 280px)) calc(8px + env(safe-area-inset-bottom)); z-index:40; }
      .tab{ flex:1; max-width:108px; border:none; background:none; display:flex; flex-direction:column; align-items:center; gap:3px; padding:5px 2px; font-family:inherit; font-size:10.5px; font-weight:600; color:var(--muted); cursor:pointer; }
      .tab.on{ color:var(--green); }

      /* modals */
      .ovl{ position:fixed; inset:0; background:rgba(30,43,37,0.4); backdrop-filter:blur(3px); display:flex; align-items:flex-end; justify-content:center; z-index:100; }
      .sheet{ background:var(--card); color:var(--ink); border-radius:22px 22px 0 0; padding:20px 18px calc(26px + env(safe-area-inset-bottom)); width:100%; max-width:560px; max-height:92vh; overflow-y:auto; animation:rise .22s ease; font-family:'Hanken Grotesk',sans-serif; }
      @keyframes rise{ from{ transform:translateY(40px); opacity:.6; } to{ transform:none; opacity:1; } }
      .sh-h{ display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
      .sh-h h3{ font-family:'Fraunces',serif; font-weight:500; font-size:20px; }
      .xx{ background:var(--paper); border:none; border-radius:9px; padding:7px; cursor:pointer; color:var(--muted); display:grid; place-items:center; }
      .fld{ display:flex; flex-direction:column; gap:5px; margin-bottom:11px; }
      .fld>span{ font-size:12.5px; font-weight:600; color:var(--muted); }
      .fld input, .fld select{ border:1px solid var(--line); background:var(--paper); border-radius:11px; padding:12px 13px; font-family:inherit; font-size:15px; color:var(--ink); outline:none; width:100%; }
      .fld input:focus, .fld select:focus{ border-color:var(--green); }
      .fld.row{ flex-direction:row; align-items:center; justify-content:space-between; gap:12px; margin-bottom:7px; }
      .fld.row>span{ font-size:14px; color:var(--ink); font-weight:500; } .fld.row input{ width:120px; text-align:right; }
      .toggle{ width:100%; display:flex; align-items:center; gap:9px; border:1px solid var(--line); background:var(--paper); border-radius:11px; padding:12px 13px; font-family:inherit; font-size:14.5px; font-weight:600; color:var(--ink); cursor:pointer; margin-bottom:11px; }
      .toggle svg{ color:var(--muted); } .toggle.on{ border-color:var(--green); background:rgba(31,90,71,0.06); } .toggle.on svg{ color:var(--green); }

      .toast{ position:fixed; bottom:84px; left:50%; transform:translateX(-50%); background:var(--green-d); color:#fff; padding:11px 18px; border-radius:30px; font-family:'Hanken Grotesk',sans-serif; font-size:13.5px; font-weight:600; box-shadow:0 8px 24px rgba(0,0,0,0.2); z-index:200; animation:rise .2s ease; max-width:90vw; text-align:center; }
    `}</style>
  );
}
