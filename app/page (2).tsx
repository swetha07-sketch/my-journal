"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const APP_PASSWORD = "sh@kti98";

function PasswordScreen({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    if (input === APP_PASSWORD) {
      sessionStorage.setItem("journal_unlocked", "true");
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #faf8f4; font-family: 'DM Sans', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .lock-wrap { width: 100%; max-width: 360px; margin: 0 auto; padding: 2rem 1.5rem; text-align: center; }
        .lock-icon { font-size: 2.5rem; margin-bottom: 1.5rem; }
        .lock-title { font-family: 'Lora', serif; font-size: 1.8rem; font-weight: 400; color: #1a1714; margin-bottom: 6px; }
        .lock-sub { font-size: 13px; color: #a8a29e; margin-bottom: 2rem; letter-spacing: 0.06em; text-transform: uppercase; }
        .lock-input-wrap { position: relative; margin-bottom: 12px; }
        .lock-input { width: 100%; padding: 12px 16px; border: 1px solid #e5e0d8; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 16px; color: #1a1714; background: #ffffff; outline: none; text-align: center; letter-spacing: 0.1em; transition: border 0.15s; }
        .lock-input:focus { border-color: #8b6f47; }
        .lock-input.error { border-color: #e24b4a; background: #fde8e8; }
        .lock-input.shake { animation: shake 0.4s ease; }
        .lock-btn { width: 100%; padding: 12px; background: #1a1714; color: #ffffff; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; margin-top: 4px; }
        .lock-btn:hover { opacity: 0.82; }
        .error-msg { font-size: 13px; color: #e24b4a; margin-bottom: 12px; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
      <div className="lock-wrap">
        <div className="lock-icon">🔒</div>
        <div className="lock-title">My Journal</div>
        <div className="lock-sub">Enter password to continue</div>
        {error && <div className="error-msg">Incorrect password — try again</div>}
        <div className="lock-input-wrap">
          <input
            className={`lock-input${error ? " error" : ""}${shake ? " shake" : ""}`}
            type="password"
            placeholder="••••••••••••"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>
        <button className="lock-btn" onClick={handleSubmit}>Unlock</button>
      </div>
    </>
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MOOD_LABELS: Record<number, string> = {
  1: "Depressed", 2: "Very low", 3: "Low", 4: "Below average",
  5: "Neutral", 6: "Okay", 7: "Good", 8: "Great", 9: "Very happy", 10: "Euphoric"
};

const getMoodColor = (v: number) => {
  if (v <= 2) return { bg: "#fde8e8", text: "#a32d2d", border: "#f09595" };
  if (v <= 4) return { bg: "#faeeda", text: "#854f0b", border: "#fac775" };
  if (v === 5) return { bg: "#f1efe8", text: "#5f5e5a", border: "#d3d1c7" };
  if (v <= 7) return { bg: "#eaf3de", text: "#3b6d11", border: "#c0dd97" };
  return { bg: "#e1f5ee", text: "#0f6e56", border: "#9fe1cb" };
};

interface Entry {
  id: number;
  title: string;
  date: string;
  time: string;
  place: string;
  people: string;
  mood: number;
  journal: string;
  created_at?: string;
}

interface FormState {
  title: string;
  date: string;
  time: string;
  place: string;
  people: string;
  mood: number;
  journal: string;
}

const emptyForm = (): FormState => {
  const now = new Date();
  return {
    title: "", date: now.toISOString().split("T")[0],
    time: now.toTimeString().slice(0, 5),
    place: "", people: "", mood: 5, journal: ""
  };
};

export default function Home() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState("write");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const isUnlocked = sessionStorage.getItem("journal_unlocked") === "true";
    if (isUnlocked) setUnlocked(true);
  }, []);

  useEffect(() => { if (unlocked) fetchEntries(); }, [unlocked]);

  if (!unlocked) return <PasswordScreen onUnlock={() => setUnlocked(true)} />;

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setEntries(data);
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast("Please add a title"); return; }
    if (!form.journal.trim()) { showToast("Please write something in your journal"); return; }
    setSaving(true);
    const { error } = await supabase.from("entries").insert([form]);
    if (error) {
      showToast("Error saving — please try again");
      console.error(error);
    } else {
      setForm(emptyForm());
      showToast("Entry saved!");
      await fetchEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (!error) {
      setEntries(entries.filter(e => e.id !== id));
      if (expanded === id) setExpanded(null);
      showToast("Entry deleted");
    }
  };

  const filtered = entries.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.journal.toLowerCase().includes(search.toLowerCase()) ||
    (e.place && e.place.toLowerCase().includes(search.toLowerCase()))
  );

  const formatDate = (d: string, t: string) => {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    const str = date.toLocaleDateString("en-AU", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
    return t ? `${str} at ${t}` : str;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #faf8f4; --paper: #f4f1eb; --ink: #1a1714;
          --ink-soft: #6b6560; --ink-faint: #a8a29e;
          --border: #e5e0d8; --border-soft: #ede9e2;
          --accent: #8b6f47; --white: #ffffff;
        }
        html, body { background: var(--cream); color: var(--ink); font-family: 'DM Sans', sans-serif; min-height: 100vh; }
        .app { max-width: 680px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
        .masthead { text-align: center; margin-bottom: 2.5rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border); }
        .masthead-title { font-family: 'Lora', serif; font-size: 2.2rem; font-weight: 400; color: var(--ink); }
        .masthead-sub { font-size: 13px; color: var(--ink-faint); margin-top: 6px; letter-spacing: 0.08em; text-transform: uppercase; }
        .tabs { display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 1.75rem; background: var(--paper); }
        .tab { flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink-soft); transition: all 0.15s; }
        .tab.active { background: var(--white); color: var(--ink); font-weight: 500; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 1.5rem; margin-bottom: 1rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .fg { display: flex; flex-direction: column; gap: 6px; }
        .fg.full { grid-column: 1 / -1; }
        label { font-size: 11px; font-weight: 500; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.07em; }
        input[type=text], input[type=date], input[type=time], textarea {
          width: 100%; border: 1px solid var(--border); border-radius: 8px;
          padding: 9px 12px; font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: var(--ink); background: var(--cream); outline: none; transition: border 0.15s;
        }
        input:focus, textarea:focus { border-color: var(--accent); background: var(--white); }
        textarea { resize: vertical; min-height: 160px; line-height: 1.7; font-family: 'Lora', serif; font-size: 15px; }
        .mood-wrap { display: flex; flex-direction: column; gap: 8px; }
        .mood-row { display: flex; align-items: center; gap: 12px; }
        .mood-num { font-family: 'Lora', serif; font-size: 1.6rem; font-weight: 400; color: var(--ink); min-width: 32px; }
        input[type=range] { flex: 1; accent-color: var(--accent); cursor: pointer; }
        .mood-ends { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-faint); }
        .char-hint { font-size: 11px; color: var(--ink-faint); text-align: right; }
        .btn-row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 1.25rem; }
        .btn-primary { padding: 9px 22px; background: var(--ink); color: var(--white); border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
        .btn-primary:hover { opacity: 0.82; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost { padding: 9px 16px; background: transparent; border: 1px solid var(--border); border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--ink-soft); cursor: pointer; }
        .btn-ghost:hover { background: var(--paper); }
        .search-wrap { margin-bottom: 1rem; }
        .search-wrap input { background: var(--white); }
        .entries-list { display: flex; flex-direction: column; gap: 10px; }
        .entry { background: var(--white); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: border-color 0.15s; }
        .entry:hover { border-color: #c9c0b5; }
        .entry-header { padding: 1.1rem 1.25rem; cursor: pointer; }
        .entry-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .entry-title { font-family: 'Lora', serif; font-size: 16px; font-weight: 500; color: var(--ink); flex: 1; }
        .entry-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .mood-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
        .del-btn { background: none; border: none; cursor: pointer; font-size: 14px; color: var(--ink-faint); padding: 2px 4px; border-radius: 4px; }
        .del-btn:hover { color: #a32d2d; }
        .entry-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; font-size: 12px; color: var(--ink-faint); }
        .entry-preview { margin-top: 8px; font-size: 13px; color: var(--ink-soft); line-height: 1.55; font-family: 'Lora', serif; font-style: italic; }
        .entry-body { padding: 0 1.25rem 1.25rem; border-top: 1px solid var(--border-soft); }
        .entry-full { padding-top: 1rem; font-family: 'Lora', serif; font-size: 15px; line-height: 1.8; color: var(--ink); white-space: pre-wrap; }
        .entry-extra { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-soft); }
        .extra-item { font-size: 12px; }
        .extra-label { color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
        .extra-val { color: var(--ink); font-weight: 500; margin-top: 2px; }
        .empty { text-align: center; padding: 3.5rem 1rem; color: var(--ink-faint); font-size: 14px; }
        .empty-icon { font-size: 2rem; margin-bottom: 12px; }
        .loading { text-align: center; padding: 3rem; color: var(--ink-faint); font-size: 14px; }
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--white); padding: 9px 20px; border-radius: 10px; font-size: 13px; font-family: 'DM Sans', sans-serif; opacity: 0; pointer-events: none; transition: opacity 0.2s; z-index: 999; white-space: nowrap; }
        .toast.show { opacity: 1; }
        @media (max-width: 500px) {
          .form-grid { grid-template-columns: 1fr; }
          .fg.full { grid-column: 1; }
          .masthead-title { font-size: 1.7rem; }
          .app { padding: 1.25rem 1rem 4rem; }
        }
      `}</style>

      <div className="app">
        <div className="masthead">
          <div className="masthead-title">My Journal</div>
          <div className="masthead-sub">Your private space to reflect</div>
        </div>

        <div className="tabs">
          <button className={`tab${tab === "write" ? " active" : ""}`} onClick={() => setTab("write")}>Write entry</button>
          <button className={`tab${tab === "entries" ? " active" : ""}`} onClick={() => { setTab("entries"); fetchEntries(); }}>
            Past entries {entries.length > 0 && `(${entries.length})`}
          </button>
        </div>

        {tab === "write" && (
          <div className="card">
            <div className="form-grid">
              <div className="fg full">
                <label>Title</label>
                <input type="text" placeholder="What is this entry about?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="fg">
                <label>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="fg">
                <label>Time</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </div>
              <div className="fg full">
                <label>Place</label>
                <input type="text" placeholder="Where are you right now?" value={form.place} onChange={e => setForm({ ...form, place: e.target.value })} />
              </div>
              <div className="fg full">
                <label>People with you</label>
                <input type="text" placeholder="Who are you with? (e.g. Maria, John)" value={form.people} onChange={e => setForm({ ...form, people: e.target.value })} />
              </div>
              <div className="fg full">
                <label>Mood — {form.mood}/10 · {MOOD_LABELS[form.mood]}</label>
                <div className="mood-wrap">
                  <div className="mood-row">
                    <span className="mood-num">{form.mood}</span>
                    <input type="range" min="1" max="10" step="1" value={form.mood} onChange={e => setForm({ ...form, mood: parseInt(e.target.value) })} />
                  </div>
                  <div className="mood-ends"><span>1 · Depressed</span><span>10 · Euphoric</span></div>
                </div>
              </div>
              <div className="fg full">
                <label>Journal entry</label>
                <textarea placeholder="Write freely... what happened, how it felt, what you noticed..." value={form.journal} onChange={e => setForm({ ...form, journal: e.target.value })} />
                <div className="char-hint">{form.journal.length} characters</div>
              </div>
            </div>
            <div className="btn-row">
              <button className="btn-ghost" onClick={() => setForm(emptyForm())}>Clear</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save entry"}
              </button>
            </div>
          </div>
        )}

        {tab === "entries" && (
          <>
            <div className="search-wrap">
              <input type="text" placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loading ? (
              <div className="loading">Loading your entries...</div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📖</div>
                {entries.length === 0 ? "No entries yet. Write your first one!" : "No entries match your search."}
              </div>
            ) : (
              <div className="entries-list">
                {filtered.map(en => {
                  const mc = getMoodColor(en.mood);
                  const isOpen = expanded === en.id;
                  return (
                    <div className="entry" key={en.id}>
                      <div className="entry-header" onClick={() => setExpanded(isOpen ? null : en.id)}>
                        <div className="entry-top">
                          <span className="entry-title">{en.title}</span>
                          <div className="entry-actions">
                            <span className="mood-badge" style={{ background: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}>
                              {en.mood}/10 · {MOOD_LABELS[en.mood]}
                            </span>
                            <button className="del-btn" onClick={e => { e.stopPropagation(); handleDelete(en.id); }}>✕</button>
                          </div>
                        </div>
                        <div className="entry-meta">
                          {formatDate(en.date, en.time) && <span>{formatDate(en.date, en.time)}</span>}
                          {en.place && <span>📍 {en.place}</span>}
                          {en.people && <span>👥 {en.people}</span>}
                        </div>
                        {!isOpen && <div className="entry-preview">&ldquo;{en.journal.slice(0, 120)}{en.journal.length > 120 ? "…" : ""}&rdquo;</div>}
                      </div>
                      {isOpen && (
                        <div className="entry-body">
                          <div className="entry-full">{en.journal}</div>
                          {(en.place || en.people) && (
                            <div className="entry-extra">
                              {en.place && <div className="extra-item"><div className="extra-label">Place</div><div className="extra-val">{en.place}</div></div>}
                              {en.people && <div className="extra-item"><div className="extra-label">With</div><div className="extra-val">{en.people}</div></div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </>
  );
}
