import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import { useToast } from "../components/Toast.jsx";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Empty,
  Modal,
  Stat,
  fmtRp,
} from "../components/ui.jsx";
import { IconPlus, IconEdit, IconTrash } from "../components/Icons.jsx";

// ── Inline icons (not in components/Icons.jsx yet) ───────────────────────────
const I = ({ size = 14, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IconSearch = (p) => <I {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></I>;
const IconXMark = (p) => <I {...p}><path d="M18 6 6 18M6 6l12 12"/></I>;
const IconDown = (p) => <I {...p}><path d="m6 9 6 6 6-6"/></I>;
const IconListIcon = (p) => <I {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></I>;
const IconRows = (p) => <I {...p}><path d="M3 5h18M3 12h18M3 19h18"/></I>;
const IconBoxIcon = (p) => <I {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></I>;

// ── Style injection (scoped to .shippers-page) ──────────────────────────────
const STYLES_ID = "__shippers-page-styles";
const STYLES = `
.shippers-page .sh-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; }
.shippers-page .sh-kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.shippers-page .sh-kpi__lbl { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; color: var(--fg-3); text-transform: uppercase; }
.shippers-page .sh-kpi__val { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: var(--fg); font-variant-numeric: tabular-nums; }
.shippers-page .sh-kpi__sub { font-size: 11px; color: var(--fg-3); }
.shippers-page .sh-kpi--accent .sh-kpi__val { color: var(--accent); }

.shippers-page .sh-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.shippers-page .sh-toolbar__search { flex: 1; min-width: 240px; position: relative; }
.shippers-page .sh-toolbar__search > svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-3); pointer-events: none; }
.shippers-page .sh-toolbar__search input { width: 100%; padding: 0 36px 0 36px; background: var(--surface); color: var(--fg); border: 1px solid var(--border); border-radius: 8px; height: 36px; font: inherit; font-size: 13px; outline: none; transition: border-color .12s, box-shadow .12s; }
.shippers-page .sh-toolbar__search input:hover { border-color: var(--border-strong); }
.shippers-page .sh-toolbar__search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.shippers-page .sh-toolbar__search input::placeholder { color: var(--fg-4); }
.shippers-page .sh-toolbar__search button.clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: 0; padding: 4px; border-radius: 4px; color: var(--fg-3); cursor: pointer; display: grid; place-items: center; }
.shippers-page .sh-toolbar__search button.clear:hover { background: var(--surface-2); color: var(--fg); }

.shippers-page .sh-sort { position: relative; height: 36px; }
.shippers-page .sh-sort select { appearance: none; background: var(--surface); color: var(--fg); border: 1px solid var(--border); border-radius: 8px; padding: 0 32px 0 12px; height: 36px; font: inherit; font-size: 13px; cursor: pointer; }
.shippers-page .sh-sort select:hover { border-color: var(--border-strong); }
.shippers-page .sh-sort > svg { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--fg-3); pointer-events: none; }

.shippers-page .sh-seg { display: inline-flex; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 2px; gap: 2px; height: 36px; }
.shippers-page .sh-seg button { background: transparent; border: 0; padding: 0 10px; font-size: 12px; font-weight: 500; border-radius: 6px; color: var(--fg-3); cursor: pointer; font: inherit; display: inline-flex; align-items: center; gap: 6px; }
.shippers-page .sh-seg button:hover { color: var(--fg); }
.shippers-page .sh-seg button.is-active { background: var(--surface); color: var(--fg); box-shadow: var(--shadow-card); }

.shippers-page .sh-chipbar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.shippers-page .sh-chipbar__lbl { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; color: var(--fg-3); text-transform: uppercase; margin-right: 4px; }
.shippers-page .sh-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border); font-size: 12px; color: var(--fg-2); font-weight: 500; cursor: pointer; transition: border-color .12s, background .12s, color .12s; }
.shippers-page .sh-chip:hover { border-color: var(--border-strong); color: var(--fg); }
.shippers-page .sh-chip.is-on { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
.shippers-page .sh-chip__count { color: var(--fg-3); font-variant-numeric: tabular-nums; }
.shippers-page .sh-chip.is-on .sh-chip__count { color: var(--accent); opacity: .7; }
.shippers-page .sh-chip--clear { color: var(--fg-3); background: transparent; border-color: transparent; }
.shippers-page .sh-chip--clear:hover { color: var(--fg); background: var(--hover); }

.shippers-page .sh-table-wrap { border: 1px solid var(--border); border-radius: 12px; background: var(--surface); overflow: hidden; }
.shippers-page .sh-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
.shippers-page .sh-table thead th { text-align: left; font-weight: 600; color: var(--fg-3); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 11px 16px; border-bottom: 1px solid var(--border); background: var(--bg-2); white-space: nowrap; user-select: none; }
.shippers-page .sh-table thead th.is-sortable { cursor: pointer; }
.shippers-page .sh-table thead th.is-sortable:hover { color: var(--fg-2); }
.shippers-page .sh-table thead th.is-active { color: var(--fg); }
.shippers-page .sh-table thead th .sort-arrow { display: inline-block; margin-left: 4px; font-size: 9px; opacity: .5; }
.shippers-page .sh-table thead th .sort-arrow.is-active { opacity: 1; color: var(--accent); }
.shippers-page .sh-table thead th.right { text-align: right; }
.shippers-page .sh-table tbody td { padding: 13px 16px; border-bottom: 1px solid var(--border); color: var(--fg-2); vertical-align: middle; }
.shippers-page .sh-table tbody tr:last-child td { border-bottom: 0; }
.shippers-page .sh-table tbody tr { transition: background .12s; }
.shippers-page .sh-table tbody tr:hover td { background: var(--hover); }
.shippers-page .sh-table tbody tr:hover .sh-row-actions { opacity: 1; }

.shippers-page .sh-name-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.shippers-page .sh-avatar { width: 30px; height: 30px; border-radius: 7px; background: var(--surface-2); color: var(--fg-2); display: grid; place-items: center; font-size: 11.5px; font-weight: 700; flex-shrink: 0; border: 1px solid var(--border); }
.shippers-page .sh-avatar.tone-0 { background: rgba(220,38,38,0.10);  color: #F87171; border-color: rgba(220,38,38,0.18); }
.shippers-page .sh-avatar.tone-1 { background: rgba(52,211,153,0.10); color: #34D399; border-color: rgba(52,211,153,0.18); }
.shippers-page .sh-avatar.tone-2 { background: rgba(251,191,36,0.10); color: #FBBF24; border-color: rgba(251,191,36,0.18); }
.shippers-page .sh-avatar.tone-3 { background: rgba(96,165,250,0.10); color: #60A5FA; border-color: rgba(96,165,250,0.18); }
.shippers-page .sh-avatar.tone-4 { background: rgba(167,139,250,0.10); color: #A78BFA; border-color: rgba(167,139,250,0.18); }
.shippers-page .sh-avatar.tone-5 { background: rgba(244,114,182,0.10); color: #F472B6; border-color: rgba(244,114,182,0.18); }

.shippers-page .sh-name-wrap { min-width: 0; }
.shippers-page .sh-name { font-size: 13.5px; font-weight: 500; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.shippers-page .sh-name-sub { font-size: 11px; color: var(--fg-3); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.shippers-page .sh-coms { display: flex; gap: 4px; flex-wrap: nowrap; overflow: hidden; align-items: center; }
.shippers-page .sh-coms .badge { flex-shrink: 0; max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
.shippers-page .sh-coms__more { font-size: 11px; color: var(--fg-3); padding: 2px 6px; flex-shrink: 0; }

.shippers-page .sh-num { font-family: "Geist Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.shippers-page .sh-num--strong { color: var(--fg); font-weight: 500; }
.shippers-page .sh-num--small { font-size: 11.5px; color: var(--fg-3); }

.shippers-page .sh-tagihan { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; }
.shippers-page .sh-tagihan__bar { width: 36px; height: 4px; border-radius: 2px; background: var(--surface-2); overflow: hidden; position: relative; }
.shippers-page .sh-tagihan__bar::after { content: ""; position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); width: var(--w, 0%); }

.shippers-page .sh-row-actions { display: flex; gap: 2px; justify-content: flex-end; opacity: 0; transition: opacity .12s; }
.shippers-page .sh-row-actions__btn { width: 28px; height: 28px; border-radius: 6px; background: transparent; border: 0; color: var(--fg-3); display: grid; place-items: center; cursor: pointer; }
.shippers-page .sh-row-actions__btn:hover { background: var(--surface-2); color: var(--fg); }
.shippers-page .sh-row-actions__btn--danger:hover { background: var(--danger-soft); color: var(--danger); }

.shippers-page .sh-foot { padding: 10px 16px; background: var(--bg-2); border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--fg-3); }

.shippers-page .sh-list { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--surface); }
.shippers-page .sh-list__row { display: grid; grid-template-columns: minmax(220px, 1.4fr) minmax(0, 2fr) 100px 140px auto; gap: 16px; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); transition: background .12s; }
.shippers-page .sh-list__row:last-child { border-bottom: 0; }
.shippers-page .sh-list__row:hover { background: var(--hover); }
.shippers-page .sh-list__row:hover .sh-row-actions { opacity: 1; }
@media (max-width: 920px) { .shippers-page .sh-list__row { grid-template-columns: 1fr; gap: 10px; } }

.shippers-page .sh-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.shippers-page .sh-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-card); padding: 16px; display: flex; flex-direction: column; gap: 12px; transition: border-color .12s; }
.shippers-page .sh-card:hover { border-color: var(--border-strong); }
.shippers-page .sh-card:hover .sh-row-actions { opacity: 1; }
.shippers-page .sh-card__hd { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.shippers-page .sh-card__stats { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin: 0 -16px; padding: 12px 16px; gap: 4px 16px; }
.shippers-page .sh-card__stat-lbl { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; color: var(--fg-3); text-transform: uppercase; }
.shippers-page .sh-card__stat-val { font-size: 15px; font-weight: 600; color: var(--fg); font-variant-numeric: tabular-nums; margin-top: 2px; }
.shippers-page .sh-card__coms-lbl { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; color: var(--fg-3); text-transform: uppercase; margin-bottom: 8px; }
.shippers-page .sh-card__coms { display: flex; flex-wrap: wrap; gap: 5px; }

.shippers-page .sh-empty { padding: 48px 16px; text-align: center; border: 1px dashed var(--border-strong); border-radius: 12px; background: var(--bg-2); }
.shippers-page .sh-empty__icon { width: 44px; height: 44px; border-radius: 50%; background: var(--surface-2); color: var(--fg-3); display: inline-grid; place-items: center; margin-bottom: 12px; }
.shippers-page .sh-empty__title { font-size: 14px; font-weight: 600; color: var(--fg); margin-bottom: 4px; }
.shippers-page .sh-empty__sub { font-size: 12.5px; color: var(--fg-3); }
`;

function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById(STYLES_ID)) return;
    const el = document.createElement("style");
    el.id = STYLES_ID;
    el.textContent = STYLES;
    document.head.appendChild(el);
  }, []);
}

// ── helpers ─────────────────────────────────────────────────────────────────
const fmtRpShort = (n) => {
  if (!n) return "Rp 0";
  if (n >= 1_000_000_000) return "Rp " + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "jt";
  if (n >= 1_000) return "Rp " + Math.round(n / 1_000) + "rb";
  return "Rp " + n.toLocaleString("id-ID");
};

const initialsOf = (name = "") => {
  const parts = name.replace(/^(PT|CV)\s+/i, "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const hashTone = (id) => {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 6;
};

// ── Commodity list editor (unchanged from your file) ─────────────────────────
function CommodityTagInput({ commodities, onChange }) {
  function update(idx, val) {
    onChange(commodities.map((c, i) => (i === idx ? { ...c, name: val } : c)));
  }
  function remove(idx) {
    onChange(commodities.filter((_, i) => i !== idx));
  }
  function addRow() {
    onChange([...commodities, { id: null, name: "" }]);
  }
  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addRow();
    }
  }

  return (
    <div className="col" style={{ gap: 6 }}>
      {commodities.length === 0 && (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Belum ada komoditas. Klik tombol di bawah untuk menambahkan.
        </p>
      )}
      {commodities.map((c, i) => (
        <div key={i} className="row" style={{ gap: 8, alignItems: "center" }}>
          <Input
            autoFocus={c.id === null && i === commodities.length - 1}
            value={c.name}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nama komoditas"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`Hapus ${c.name || "komoditas"}`}
            style={{
              flexShrink: 0,
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              cursor: "pointer",
              width: 32, height: 32,
              display: "grid", placeItems: "center",
              color: "var(--danger)", fontSize: 16, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        icon={<IconPlus size={12} />}
        onClick={addRow}
        style={{ alignSelf: "flex-start", marginTop: 2 }}
      >
        Tambah Komoditas
      </Button>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Avatar({ shipper, size = 30 }) {
  return (
    <div className={`sh-avatar tone-${hashTone(shipper.id)}`}
         style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {initialsOf(shipper.name)}
    </div>
  );
}

function CommodityChips({ items, max = 3 }) {
  const visible = items.slice(0, max);
  const overflow = items.length - max;
  return (
    <div className="sh-coms">
      {visible.map((c) => (
        <span key={c.id ?? c.name} className="badge badge--muted">{c.name}</span>
      ))}
      {overflow > 0 && <span className="sh-coms__more">+{overflow}</span>}
    </div>
  );
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="sh-row-actions" onClick={(e) => e.stopPropagation()}>
      <button className="sh-row-actions__btn" title="Edit" onClick={onEdit}>
        <IconEdit size={14} />
      </button>
      <button className="sh-row-actions__btn sh-row-actions__btn--danger" title="Hapus" onClick={onDelete}>
        <IconTrash size={14} />
      </button>
    </div>
  );
}

// ── KPI strip ───────────────────────────────────────────────────────────────
function KpiStrip({ filtered, total }) {
  const filteredCount = filtered.length;
  const totalBookings = filtered.reduce((a, s) => a + (s.booking_count ?? 0), 0);
  const totalTagihan = filtered.reduce((a, s) => a + (s.total_tagihan ?? 0), 0);
  const uniqueCommodities = new Set(
    filtered.flatMap((s) => (s.commodities ?? []).map((c) => c.name))
  ).size;

  return (
    <div className="sh-kpis">
      <div className="sh-kpi">
        <div className="sh-kpi__lbl">Shippers</div>
        <div className="sh-kpi__val">{filteredCount}</div>
        <div className="sh-kpi__sub">
          {filteredCount === total ? "Total semua" : `dari ${total} total`}
        </div>
      </div>
      <div className="sh-kpi">
        <div className="sh-kpi__lbl">Komoditas Unik</div>
        <div className="sh-kpi__val">{uniqueCommodities}</div>
        <div className="sh-kpi__sub">Auto-suggest saat buat booking</div>
      </div>
      <div className="sh-kpi">
        <div className="sh-kpi__lbl">Total Booking</div>
        <div className="sh-kpi__val">{totalBookings.toLocaleString("id-ID")}</div>
        <div className="sh-kpi__sub">Semua shipper</div>
      </div>
      <div className="sh-kpi sh-kpi--accent">
        <div className="sh-kpi__lbl">Total Tagihan</div>
        <div className="sh-kpi__val">{fmtRpShort(totalTagihan)}</div>
        <div className="sh-kpi__sub">{fmtRp(totalTagihan)}</div>
      </div>
    </div>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────
function Toolbar({ q, setQ, sortKey, setSortKey, view, setView }) {
  return (
    <div className="sh-toolbar">
      <div className="sh-toolbar__search">
        <IconSearch size={15} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari shipper atau komoditas…"
        />
        {q && (
          <button className="clear" onClick={() => setQ("")} aria-label="Hapus pencarian">
            <IconXMark size={14} />
          </button>
        )}
      </div>

      <div className="sh-sort">
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="name">Urut: Nama (A–Z)</option>
          <option value="bookings">Urut: Booking terbanyak</option>
          <option value="tagihan">Urut: Total tagihan</option>
          <option value="commodities">Urut: Komoditas terbanyak</option>
        </select>
        <IconDown size={14} />
      </div>

      <div className="sh-seg" role="tablist" aria-label="View mode">
        <button className={view === "table" ? "is-active" : ""} onClick={() => setView("table")} title="Table">
          <IconListIcon size={14} /> Table
        </button>
        <button className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} title="List">
          <IconRows size={14} /> List
        </button>
        <button className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} title="Grid">
          <IconBoxIcon size={14} /> Grid
        </button>
      </div>
    </div>
  );
}

// ── Commodity filter chip bar ───────────────────────────────────────────────
function ChipBar({ commodityFreq, selected, toggle, clear }) {
  const top = commodityFreq.slice(0, 10);
  if (top.length === 0) return null;
  return (
    <div className="sh-chipbar">
      <span className="sh-chipbar__lbl">Filter komoditas:</span>
      {top.map(({ name, count }) => (
        <button
          key={name}
          className={`sh-chip ${selected.has(name) ? "is-on" : ""}`}
          onClick={() => toggle(name)}
        >
          {name} <span className="sh-chip__count">{count}</span>
        </button>
      ))}
      {selected.size > 0 && (
        <button className="sh-chip sh-chip--clear" onClick={clear}>
          <IconXMark size={12} /> Hapus filter
        </button>
      )}
    </div>
  );
}

// ── Table view ──────────────────────────────────────────────────────────────
function TableView({ rows, maxTagihan, onEdit, onDelete, sortKey, setSortKey }) {
  const colHead = (key, label, opts = {}) => {
    const active = sortKey === key;
    return (
      <th
        className={`is-sortable ${active ? "is-active" : ""} ${opts.right ? "right" : ""}`}
        onClick={() => setSortKey(key)}
      >
        {label}
        <span className={`sort-arrow ${active ? "is-active" : ""}`}>▾</span>
      </th>
    );
  };

  return (
    <div className="sh-table-wrap">
      <table className="sh-table">
        <colgroup>
          <col style={{ width: "28%" }} />
          <col style={{ width: "36%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "8%" }} />
        </colgroup>
        <thead>
          <tr>
            {colHead("name", "Shipper")}
            <th>Komoditas</th>
            {colHead("bookings", "Booking", { right: true })}
            {colHead("tagihan", "Total Tagihan", { right: true })}
            <th style={{ textAlign: "right" }}> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sh) => {
            const tagihanW = maxTagihan
              ? Math.max(4, Math.round(((sh.total_tagihan ?? 0) / maxTagihan) * 100))
              : 0;
            return (
              <tr key={sh.id}>
                <td>
                  <div className="sh-name-cell">
                    <Avatar shipper={sh} />
                    <div className="sh-name-wrap">
                      <div className="sh-name">{sh.name}</div>
                      <div className="sh-name-sub">
                        {sh.commodities?.length ?? 0} komoditas
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <CommodityChips items={sh.commodities ?? []} max={3} />
                </td>
                <td className="sh-num sh-num--strong">{sh.booking_count ?? 0}</td>
                <td>
                  <div className="sh-tagihan">
                    <span className="sh-tagihan__bar" style={{ "--w": `${tagihanW}%` }} />
                    <span className="sh-num sh-num--strong">{fmtRpShort(sh.total_tagihan ?? 0)}</span>
                  </div>
                </td>
                <td>
                  <RowActions onEdit={() => onEdit(sh)} onDelete={() => onDelete(sh)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sh-foot">
        <span>Menampilkan <b style={{ color: "var(--fg)" }}>{rows.length}</b> shipper</span>
      </div>
    </div>
  );
}

// ── List view ───────────────────────────────────────────────────────────────
function ListView({ rows, onEdit, onDelete }) {
  return (
    <div className="sh-list">
      {rows.map((sh) => (
        <div key={sh.id} className="sh-list__row">
          <div className="sh-name-cell">
            <Avatar shipper={sh} size={34} />
            <div className="sh-name-wrap">
              <div className="sh-name" style={{ fontSize: 14 }}>{sh.name}</div>
              <div className="sh-name-sub">
                {sh.commodities?.length ?? 0} komoditas
              </div>
            </div>
          </div>
          <CommodityChips items={sh.commodities ?? []} max={5} />
          <div className="sh-num">
            <div className="sh-num--strong" style={{ fontSize: 14 }}>{sh.booking_count ?? 0}</div>
            <div className="sh-num--small">booking</div>
          </div>
          <div className="sh-num">
            <div className="sh-num--strong" style={{ fontSize: 14 }}>{fmtRpShort(sh.total_tagihan ?? 0)}</div>
            <div className="sh-num--small">total tagihan</div>
          </div>
          <RowActions onEdit={() => onEdit(sh)} onDelete={() => onDelete(sh)} />
        </div>
      ))}
    </div>
  );
}

// ── Grid view (original card style, refined) ────────────────────────────────
function GridView({ rows, onEdit, onDelete }) {
  return (
    <div className="sh-grid">
      {rows.map((sh) => (
        <div key={sh.id} className="sh-card">
          <div className="sh-card__hd">
            <div className="sh-name-cell">
              <Avatar shipper={sh} size={36} />
              <div className="sh-name-wrap">
                <div className="sh-name" style={{ fontSize: 14 }}>{sh.name}</div>
                <div className="sh-name-sub">{sh.commodities?.length ?? 0} komoditas</div>
              </div>
            </div>
            <RowActions onEdit={() => onEdit(sh)} onDelete={() => onDelete(sh)} />
          </div>
          <div className="sh-card__stats">
            <div>
              <div className="sh-card__stat-lbl">Booking</div>
              <div className="sh-card__stat-val">{sh.booking_count ?? 0}</div>
            </div>
            <div>
              <div className="sh-card__stat-lbl">Total Tagihan</div>
              <div className="sh-card__stat-val">{fmtRpShort(sh.total_tagihan ?? 0)}</div>
            </div>
          </div>
          <div>
            <div className="sh-card__coms-lbl">Komoditas ({sh.commodities?.length ?? 0})</div>
            <div className="sh-card__coms">
              {(sh.commodities ?? []).length === 0 ? (
                <span className="muted" style={{ fontSize: 12 }}>Belum ada komoditas.</span>
              ) : (
                sh.commodities.map((c) => (
                  <span key={c.id ?? c.name} className="badge badge--muted">{c.name}</span>
                ))
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Shippers page ────────────────────────────────────────────────────────────
export default function Shippers() {
  useInjectStyles();
  const qc = useQueryClient();
  const toast = useToast();

  // ── Form / modal state ────────────────────────────────────────────────────
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState("");
  const [commodities, setCommodities] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  // ── List view state ───────────────────────────────────────────────────────
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [view, setView] = useState("table");
  const [selectedCommodities, setSelectedCommodities] = useState(() => new Set());

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data = [], isLoading } = useQuery({
    queryKey: ["shippers"],
    queryFn: () => api.get("/shippers").then((r) => r.data),
  });

  function openNew() {
    setEditing(null);
    setName("");
    setCommodities([]);
    setError("");
    setOpenModal(true);
  }
  function openEdit(sh) {
    setEditing(sh);
    setName(sh.name);
    setCommodities(sh.commodities.map((c) => ({ id: c.id, name: c.name })));
    setError("");
    setOpenModal(true);
  }

  const addMutation = useMutation({
    mutationFn: ({ name, commodities }) =>
      api.post("/shippers", { name, commodities }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shippers"] });
      setOpenModal(false);
      toast("Shipper berhasil ditambahkan.");
    },
    onError: (e) => setError(e.response?.data?.error ?? "Gagal menyimpan"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, commodities }) =>
      api.put(`/shippers/${id}`, { name, commodities }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shippers"] });
      setOpenModal(false);
      toast("Shipper berhasil diperbarui.");
    },
    onError: (e) => setError(e.response?.data?.error ?? "Gagal menyimpan"),
  });

  function save() {
    if (!name.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    const cleanCommodities = commodities.filter((c) => c.name.trim());
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        name: name.trim(),
        commodities: cleanCommodities,
      });
    } else {
      addMutation.mutate({
        name: name.trim(),
        commodities: cleanCommodities.map((c) => c.name),
      });
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/shippers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shippers"] });
      toast("Shipper berhasil dihapus.");
    },
    onError: () => toast("Gagal menghapus shipper."),
  });

  function confirmDelete(sh) {
    if (!window.confirm(`Hapus shipper "${sh.name}"? Semua data terkait akan ikut terhapus.`)) return;
    deleteMutation.mutate(sh.id);
  }

  const isPending = addMutation.isPending || updateMutation.isPending;

  // ── Commodity frequency (across full dataset, not filtered) ──────────────
  const commodityFreq = useMemo(() => {
    const counts = new Map();
    data.forEach((s) =>
      (s.commodities ?? []).forEach((c) =>
        counts.set(c.name, (counts.get(c.name) ?? 0) + 1)
      )
    );
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = data.filter((s) => {
      const matchesQ =
        !needle ||
        s.name.toLowerCase().includes(needle) ||
        (s.commodities ?? []).some((c) => c.name.toLowerCase().includes(needle));
      const matchesCom =
        selectedCommodities.size === 0 ||
        (s.commodities ?? []).some((c) => selectedCommodities.has(c.name));
      return matchesQ && matchesCom;
    });
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      bookings: (a, b) => (b.booking_count ?? 0) - (a.booking_count ?? 0),
      tagihan: (a, b) => (b.total_tagihan ?? 0) - (a.total_tagihan ?? 0),
      commodities: (a, b) => (b.commodities?.length ?? 0) - (a.commodities?.length ?? 0),
    };
    return [...rows].sort(sorters[sortKey] || sorters.name);
  }, [data, q, sortKey, selectedCommodities]);

  const maxTagihan = useMemo(
    () => Math.max(1, ...filtered.map((s) => s.total_tagihan ?? 0)),
    [filtered]
  );

  function toggleCom(name) {
    setSelectedCommodities((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }
  function clearCom() {
    setSelectedCommodities(new Set());
  }

  const noResults = !isLoading && data.length > 0 && filtered.length === 0;

  return (
    <div className="shippers-page">
      <PageHeader
        title="Shippers & Commodities"
        meta="Master data klien — komoditas mereka akan auto-suggest saat buat booking."
        actions={
          <Button
            variant="primary"
            icon={<IconPlus size={14} />}
            onClick={openNew}
          >
            Add Shipper
          </Button>
        }
      />

      {!isLoading && data.length > 0 && (
        <KpiStrip filtered={filtered} total={data.length} />
      )}

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editing ? "Edit Shipper" : "Add Shipper"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenModal(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              disabled={!name || isPending}
              onClick={save}
            >
              {editing ? "Save" : "Add"}
            </Button>
          </>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <Field label="Nama Shipper" required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="PT Sinar Maju Sejahtera"
            />
          </Field>
          <Field
            label="Commodities"
            hint="Edit langsung di kolom. Tekan Enter untuk tambah baris baru."
          >
            <CommodityTagInput
              commodities={commodities}
              onChange={setCommodities}
            />
          </Field>
          {error && <div className="auth__err">{error}</div>}
        </div>
      </Modal>

      {isLoading ? (
        <Empty title="Memuat…" />
      ) : data.length === 0 ? (
        <Empty
          title="Belum ada shipper"
          sub="Tambahkan shipper pertama untuk mulai mencatat booking."
          action={
            <Button
              variant="primary"
              icon={<IconPlus size={14} />}
              onClick={openNew}
            >
              Add Shipper
            </Button>
          }
        />
      ) : (
        <>
          <Toolbar
            q={q}
            setQ={setQ}
            sortKey={sortKey}
            setSortKey={setSortKey}
            view={view}
            setView={setView}
          />

          {commodityFreq.length > 0 && (
            <ChipBar
              commodityFreq={commodityFreq}
              selected={selectedCommodities}
              toggle={toggleCom}
              clear={clearCom}
            />
          )}

          {noResults ? (
            <div className="sh-empty">
              <div className="sh-empty__icon"><IconSearch size={20} /></div>
              <div className="sh-empty__title">Tidak ada shipper yang cocok</div>
              <div className="sh-empty__sub">
                Coba ubah kata kunci atau hapus filter komoditas.
              </div>
            </div>
          ) : view === "table" ? (
            <TableView
              rows={filtered}
              maxTagihan={maxTagihan}
              onEdit={openEdit}
              onDelete={confirmDelete}
              sortKey={sortKey}
              setSortKey={setSortKey}
            />
          ) : view === "list" ? (
            <ListView
              rows={filtered}
              onEdit={openEdit}
              onDelete={confirmDelete}
            />
          ) : (
            <GridView
              rows={filtered}
              onEdit={openEdit}
              onDelete={confirmDelete}
            />
          )}
        </>
      )}
    </div>
  );
}
