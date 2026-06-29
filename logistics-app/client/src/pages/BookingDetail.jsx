import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import { BookingDetailSkeleton } from "../components/Skeleton.jsx";
import { useToast } from "../components/Toast.jsx";
import { Button, Card, PageHeader, Empty, Field, Input, Select, fmtRp, fmtDate, monthLabel } from "../components/ui.jsx";
import { IconEdit, IconTrash, IconPlus, IconMore } from "../components/Icons.jsx";
import BookingDocuments from "./BookingDocuments.jsx";
import { LOKASI_OPTIONS, TRUCKING_OPTIONS, getTarif } from "../data/tarif.js";

function apiErrMsg(e, fallback) {
  const err = e?.response?.data?.error;
  if (err === 'buku_closed') return 'Buku sudah ditutup, tidak dapat diedit.';
  return err ?? fallback;
}

// ── Inline icons (kept local to avoid touching Icons.jsx) ──
const I = ({ children, size = 14, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);
const IcList = (p) => <I {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></I>;
const IcMoney = (p) => <I {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="12" cy="12" r="2.5" /></I>;
const IcDoc  = (p) => <I {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></I>;

function parseQtyCounts(str) {
  const map = {};
  if (!str) return map;
  for (const part of str.split(",")) {
    const m = part.trim().match(/^(\d+)x(\d+)(hc|HC|ft)?$/i);
    if (!m) continue;
    const num = m[2];
    const hc = m[3] && m[3].toUpperCase() === "HC";
    const size = hc ? "40HC" : num + "ft";
    map[size] = (map[size] ?? 0) + parseInt(m[1]);
  }
  return map;
}

// ── Identitas Shipment card ──────────────────────────────────────────────────
function IdentitasCard({ booking, bookingPublicId }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  function parsePlannedQty(str) {
    const c = parseQtyCounts(str);
    return { qty_20: String(c["20ft"] ?? 0), qty_40: String(c["40ft"] ?? 0), qty_40hc: String(c["40HC"] ?? 0) };
  }
  function serializePlannedQty(f) {
    const parts = [];
    if (parseInt(f.qty_20) > 0) parts.push(`${f.qty_20}x20ft`);
    if (parseInt(f.qty_40) > 0) parts.push(`${f.qty_40}x40ft`);
    if (parseInt(f.qty_40hc) > 0) parts.push(`${f.qty_40hc}x40HC`);
    return parts.join(", ");
  }

  const [form, setForm] = useState({
    job_no: booking.job_no ?? "",
    shipper: booking.shipper ?? "",
    commodity: booking.commodity ?? "",
    ...parsePlannedQty(booking.planned_qty ?? ""),
    lokasi_muat: booking.lokasi_muat ?? "",
    notes: booking.notes ?? "",
  });

  // Reset form to booking values when booking changes or edit mode exits (render-phase sync)
  const [prevSync, setPrevSync] = useState({ booking, editing });
  if (prevSync.booking !== booking || prevSync.editing !== editing) {
    setPrevSync({ booking, editing });
    if (!editing) {
      setForm({
        job_no: booking.job_no ?? "",
        shipper: booking.shipper ?? "",
        commodity: booking.commodity ?? "",
        ...parsePlannedQty(booking.planned_qty ?? ""),
        lokasi_muat: booking.lokasi_muat ?? "",
        notes: booking.notes ?? "",
      });
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/bookings/${bookingPublicId}/identitas`, { ...form, planned_qty: serializePlannedQty(form) }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingPublicId] });
      setEditing(false);
      toast("Identitas disimpan.");
    },
    onError: (e) => toast(e?.response?.data?.error ?? "Gagal menyimpan.", "error"),
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (!editing) {
    const plannedCounts = parseQtyCounts(booking.planned_qty);
    const actualCounts = parseQtyCounts(booking.qty);
    const mismatchItems = [];
    if (booking.planned_qty) {
      const allSizes = new Set([...Object.keys(plannedCounts), ...Object.keys(actualCounts)]);
      for (const size of allSizes) {
        const p = plannedCounts[size] ?? 0;
        const a = actualCounts[size] ?? 0;
        if (p !== a) mismatchItems.push({ size, planned: p, actual: a });
      }
    }
    return (
      <Card title="Identitas Shipment" action={<Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => setEditing(true)}>Edit</Button>}>
        <div className="kv-grid">
          <div className="kv-grid__item"><div className="kv-grid__lbl">Job No</div><div className="kv-grid__val mono">{booking.job_no || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Shipper</div><div className="kv-grid__val">{booking.shipper || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Commodity</div><div className="kv-grid__val">{booking.commodity || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Qty</div><div className="kv-grid__val">{booking.planned_qty || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Lokasi Muat</div><div className="kv-grid__val">{booking.lokasi_muat || "—"}</div></div>
        </div>
        {mismatchItems.length > 0 && (
          <div style={{ marginTop: 10, padding: "8px 10px", background: "color-mix(in srgb, #f59e0b 12%, var(--bg-1))", border: "1px solid #f59e0b", borderRadius: 6, fontSize: 12.5, color: "var(--fg-1)" }}>
            <strong style={{ color: "#b45309" }}>⚠ Container belum sesuai qty:</strong>
            {mismatchItems.map(({ size, planned, actual }) => (
              <div key={size} style={{ marginTop: 3 }}>
                {size}: planned <strong>{planned}</strong>, actual <strong>{actual}</strong>
                {actual < planned ? ` — kurang ${planned - actual}` : ` — lebih ${actual - planned}`}
              </div>
            ))}
          </div>
        )}
        {booking.notes && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <div className="kv-grid__lbl" style={{ marginBottom: 4 }}>Catatan</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{booking.notes}</div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title="Identitas Shipment — Edit" action={
      <div className="row" style={{ gap: 6 }}>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saveMutation.isPending}>Batal</Button>
        <Button variant="primary" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    }>
      <div className="grid grid-form-2">
        <Field label="Job No" required><Input value={form.job_no} onChange={set("job_no")} /></Field>
        <Field label="Shipper" required><Input value={form.shipper} onChange={set("shipper")} /></Field>
        <Field label="Commodity"><Input value={form.commodity} onChange={set("commodity")} /></Field>
        <Field label="Qty" required span={2}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 320 }}>
            {[["20ft", "qty_20"], ["40ft", "qty_40"], ["40HC", "qty_40hc"]].map(([label, key]) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--fg-2)", fontWeight: 600 }}>{label}</span>
                <input
                  type="number" min="0" max="99"
                  className="inp"
                  style={{ textAlign: "center", fontSize: 16, fontWeight: 600, padding: "6px 8px" }}
                  value={form[key]}
                  onChange={set(key)}
                />
              </div>
            ))}
          </div>
        </Field>
        <Field label="Lokasi Muat">
          <Select value={form.lokasi_muat} onChange={set("lokasi_muat")}>
            <option value="">— Pilih lokasi muat —</option>
            {!LOKASI_OPTIONS.includes(form.lokasi_muat) && form.lokasi_muat && <option value={form.lokasi_muat}>{form.lokasi_muat}</option>}
            {LOKASI_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Notes" span={2}><textarea className="inp" rows={3} value={form.notes} onChange={set("notes")} /></Field>
      </div>
    </Card>
  );
}

function PelayaranCard({ booking, bookingPublicId }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    pelayaran: booking.pelayaran ?? "",
    carrier: booking.carrier ?? "",
    tanggal_pelayaran: booking.tanggal_pelayaran ?? "",
    vessel_name: booking.vessel_name ?? "",
    vessel_no: booking.vessel_no ?? "",
    port: booking.port ?? "",
    port_discharge: booking.port_discharge ?? "",
    lokasi_muat: booking.lokasi_muat ?? "",
  });

  // Reset form to booking values when booking changes or edit mode exits (render-phase sync)
  const [prevSync, setPrevSync] = useState({ booking, editing });
  if (prevSync.booking !== booking || prevSync.editing !== editing) {
    setPrevSync({ booking, editing });
    if (!editing) {
      setForm({
        pelayaran: booking.pelayaran ?? "",
        carrier: booking.carrier ?? "",
        tanggal_pelayaran: booking.tanggal_pelayaran ?? "",
        vessel_name: booking.vessel_name ?? "",
        vessel_no: booking.vessel_no ?? "",
        port: booking.port ?? "",
        port_discharge: booking.port_discharge ?? "",
        lokasi_muat: booking.lokasi_muat ?? "",
      });
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/bookings/${bookingPublicId}/pelayaran`, form).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingPublicId] });
      setEditing(false);
      toast("Pelayaran disimpan.");
    },
    onError: (e) => toast(e?.response?.data?.error ?? "Gagal menyimpan.", "error"),
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (!editing) {
    return (
      <Card title="Pelayaran" action={<Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => setEditing(true)}>Edit</Button>}>
        <div className="kv-grid">
          <div className="kv-grid__item"><div className="kv-grid__lbl">Port of Loading</div><div className="kv-grid__val">{booking.port || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Port Discharge</div><div className={`kv-grid__val${booking.port_discharge ? "" : " dim"}`}>{booking.port_discharge || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Pelayaran</div><div className="kv-grid__val">{booking.pelayaran || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Carrier</div><div className={`kv-grid__val${booking.carrier ? "" : " dim"}`}>{booking.carrier || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Tanggal Pelayaran</div><div className={`kv-grid__val${booking.tanggal_pelayaran ? "" : " dim"}`}>{booking.tanggal_pelayaran ? fmtDate(booking.tanggal_pelayaran) : "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Vessel Name</div><div className="kv-grid__val">{booking.vessel_name || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Vessel No / Voyage</div><div className={`kv-grid__val${booking.vessel_no ? "" : " dim"}`}>{booking.vessel_no || "—"}</div></div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Pelayaran — Edit" action={
      <div className="row" style={{ gap: 6 }}>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saveMutation.isPending}>Batal</Button>
        <Button variant="primary" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    }>
      <div className="grid grid-form-2">
        <Field label="Port of Loading"><Input value={form.port} onChange={set("port")} /></Field>
        <Field label="Port Discharge"><Input value={form.port_discharge} onChange={set("port_discharge")} /></Field>
        <Field label="Pelayaran"><Input value={form.pelayaran} onChange={set("pelayaran")} placeholder="Nama feeder vessel" /></Field>
        <Field label="Carrier"><Input value={form.carrier} onChange={set("carrier")} placeholder="Nama carrier" /></Field>
        <Field label="Tanggal Pelayaran"><Input type="date" value={form.tanggal_pelayaran} onChange={set("tanggal_pelayaran")} /></Field>
        <Field label="Vessel Name"><Input value={form.vessel_name} onChange={set("vessel_name")} placeholder="Nama kapal utama" /></Field>
        <Field label="Vessel No / Voyage"><Input value={form.vessel_no} onChange={set("vessel_no")} placeholder="Nomor voyage" /></Field>
      </div>
    </Card>
  );
}

const EMPTY_CTR_FORM = () => ({ container_no: "", seal_no: "", size: "40ft", container_no_2: "", seal_no_2: "", no_sp: "", trucking: "", biaya_trucking: "", biaya_tambahan: "", in_date: "", out_date: "", notes: "" });

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{children}</div>;
}

function JadwalTruckingTable({ bookingPublicId, initialContainers, lokasiMuat }) {
  const [rows, setRows] = useState(initialContainers);
  const [mode, setMode] = useState("idle"); // "idle" | "add" | "edit"
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_CTR_FORM());
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const formRef = useRef(null);

  useEffect(() => {
    if (mode === "add") {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  }, [mode]);

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Auto-fill biaya trucking from the tarif table on trucking/size change.
  function applyTarif(patch) {
    setForm(f => {
      const next = { ...f, ...patch };
      const tarif = getTarif(lokasiMuat, next.trucking, next.size);
      if (tarif != null) next.biaya_trucking = String(tarif);
      return next;
    });
  }

  function startAdd() {
    setMode("add");
    setSelectedId(null);
    setForm(EMPTY_CTR_FORM());
  }

  function startEdit(row) {
    setMode("edit");
    setSelectedId(row.id);
    setForm({
      container_no: row.container_no ?? "",
      seal_no: row.seal_no ?? "",
      size: row.size ?? "40ft",
      container_no_2: row.container_no_2 ?? "",
      seal_no_2: row.seal_no_2 ?? "",
      no_sp: row.no_sp ?? "",
      trucking: row.trucking ?? "",
      biaya_trucking: row.biaya_trucking != null ? String(row.biaya_trucking) : "",
      biaya_tambahan: row.biaya_tambahan != null ? String(row.biaya_tambahan) : "",
      in_date: row.in_date ?? "",
      out_date: row.out_date ?? "",
      notes: row.notes ?? "",
    });
  }

  function cancel() { setMode("idle"); setSelectedId(null); }

  async function handleSave() {
    const existingNos = new Set(
      rows
        .filter(r => mode === "edit" ? r.id !== selectedId : true)
        .flatMap(r => r.size === "2x20" ? [r.container_no, r.container_no_2] : [r.container_no])
        .filter(Boolean)
    );
    const toCheck = [form.container_no, ...(form.size === "2x20" ? [form.container_no_2] : [])].filter(Boolean);
    for (const no of toCheck) {
      if (existingNos.has(no)) {
        toast(`Cont No. ${no} sudah ada di booking ini.`, "error");
        return;
      }
    }
    setSaving(true);
    const payload = {
      ...form,
      biaya_trucking: form.biaya_trucking !== "" ? parseInt(form.biaya_trucking) : null,
      biaya_tambahan: form.biaya_tambahan !== "" ? parseInt(form.biaya_tambahan) : null,
    };
    try {
      if (mode === "add") {
        const res = await api.post(`/bookings/${bookingPublicId}/containers`, payload);
        setRows(rs => [...rs, res.data]);
        queryClient.invalidateQueries({ queryKey: ["booking", bookingPublicId] });
        toast("Container ditambahkan.");
      } else {
        const res = await api.patch(`/containers/${selectedId}`, payload);
        setRows(rs => rs.map(r => r.id === selectedId ? res.data : r));
        queryClient.invalidateQueries({ queryKey: ["booking", bookingPublicId] });
        toast("Container disimpan.");
      }
      setMode("idle"); setSelectedId(null);
    } catch {
      toast("Gagal menyimpan.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(id) {
    if (!confirm("Hapus baris ini?")) return;
    try {
      await api.delete(`/containers/${id}`);
      setRows(rs => rs.filter(r => r.id !== id));
      if (selectedId === id) cancel();
      queryClient.invalidateQueries({ queryKey: ["booking", bookingPublicId] });
    } catch {
      toast("Gagal menghapus baris.", "error");
    }
  }

  const formPanel = mode !== "idle" && (
    <div ref={formRef} style={{ borderTop: "1px solid var(--border)", padding: 16, background: "var(--bg-2)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
        {mode === "add" ? "Tambah Container Baru" : `Edit Baris #${rows.findIndex(r => r.id === selectedId) + 1}`}
      </div>

      {/* Section: Container identity */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>Container</SectionLabel>
        <div style={{ marginBottom: 10 }}>
          <Field label="Size" style={{ maxWidth: 140 }}>
            <Select value={form.size} onChange={e => applyTarif({ size: e.target.value })}>
              <option value="20ft">20ft</option>
              <option value="2x20">2x20ft</option>
              <option value="40ft">40ft</option>
              <option value="40HC">40HC</option>
            </Select>
          </Field>
        </div>
        {form.size === "2x20" ? (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-1)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>① Container 1</div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Cont No."><Input className="mono" value={form.container_no} onChange={setF("container_no")} placeholder="ABCD1234567" /></Field>
                <Field label="Seal No."><Input value={form.seal_no} onChange={setF("seal_no")} /></Field>
              </div>
            </div>
            <div style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-1)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>② Container 2</div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Cont No."><Input className="mono" value={form.container_no_2} onChange={setF("container_no_2")} placeholder="ABCD1234567" /></Field>
                <Field label="Seal No."><Input value={form.seal_no_2} onChange={setF("seal_no_2")} /></Field>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Cont No."><Input className="mono" value={form.container_no} onChange={setF("container_no")} placeholder="ABCD1234567" /></Field>
            <Field label="Seal No."><Input value={form.seal_no} onChange={setF("seal_no")} /></Field>
          </div>
        )}
      </div>

      {/* Section: Trucking */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>Trucking</SectionLabel>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          <Field label="No. SP"><Input value={form.no_sp} onChange={setF("no_sp")} /></Field>
          <Field label="Trucking">
            <Select value={form.trucking} onChange={e => applyTarif({ trucking: e.target.value })}>
              <option value="">— Pilih —</option>
              {!TRUCKING_OPTIONS.includes(form.trucking) && form.trucking && <option value={form.trucking}>{form.trucking}</option>}
              {TRUCKING_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Biaya Trucking"><Input type="number" value={form.biaya_trucking} onChange={setF("biaya_trucking")} placeholder="0" /></Field>
          <Field label="Biaya Tambahan"><Input type="number" value={form.biaya_tambahan} onChange={setF("biaya_tambahan")} placeholder="0" /></Field>
        </div>
        {!lokasiMuat && <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg-3)" }}>Set Lokasi Muat di Identitas Shipment untuk auto-isi biaya.</div>}
      </div>

      {/* Section: Schedule */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>Jadwal & Catatan</SectionLabel>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          <Field label="In Date"><Input type="date" value={form.in_date} onChange={setF("in_date")} /></Field>
          <Field label="Out Date"><Input type="date" value={form.out_date} onChange={setF("out_date")} /></Field>
          <Field label="Notes" style={{ gridColumn: "span 2" }}><Input value={form.notes} onChange={setF("notes")} /></Field>
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>Batal</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan…" : mode === "add" ? "Tambah" : "Simpan"}
        </Button>
      </div>
    </div>
  );

  return (
    <Card title="Jadwal Trucking" pad={false}
      action={<Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={startAdd}>Tambah Baris</Button>}>
      <div className="tbl-wrap" style={{ overflowX: "auto" }}>
        <table className="tbl" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Cont No.</th>
              <th>Seal No.</th>
              <th style={{ width: 70 }}>Size</th>
              <th>No. SP</th>
              <th>Trucking</th>
              <th style={{ width: 130 }}>Biaya Trucking</th>
              <th style={{ width: 130 }}>Biaya Tambahan</th>
              <th style={{ width: 100 }}>In Date</th>
              <th style={{ width: 100 }}>Out Date</th>
              <th>Notes</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={12} style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                Belum ada data — klik <strong>Tambah Baris</strong>
              </td></tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.id} style={selectedId === row.id ? { background: "color-mix(in srgb, var(--accent) 8%, var(--bg-1))" } : {}}>
                <td className="muted num" style={{ fontSize: 11, textAlign: "center" }}>{String(i + 1).padStart(2, "0")}</td>
                <td className="mono" style={{ lineHeight: 1.6 }}>
                  {row.size === "2x20"
                    ? <><div>{row.container_no || "—"}</div><div style={{ color: "var(--fg-2)" }}>{row.container_no_2 || "—"}</div></>
                    : (row.container_no || <span className="dim">—</span>)}
                </td>
                <td className="mono" style={{ lineHeight: 1.6 }}>
                  {row.size === "2x20"
                    ? <><div>{row.seal_no || <span className="dim">—</span>}</div><div style={{ color: "var(--fg-2)" }}>{row.seal_no_2 || <span className="dim">—</span>}</div></>
                    : (row.seal_no || <span className="dim">—</span>)}
                </td>
                <td>{row.size || <span className="dim">—</span>}</td>
                <td>{row.no_sp || <span className="dim">—</span>}</td>
                <td>{row.trucking || <span className="dim">—</span>}</td>
                <td className="num">{row.biaya_trucking != null ? fmtRp(row.biaya_trucking) : <span className="dim">—</span>}</td>
                <td className="num">{row.biaya_tambahan != null ? fmtRp(row.biaya_tambahan) : <span className="dim">—</span>}</td>
                <td>{row.in_date ? fmtDate(row.in_date) : <span className="dim">—</span>}</td>
                <td>{row.out_date ? fmtDate(row.out_date) : <span className="dim">—</span>}</td>
                <td>{row.notes || <span className="dim">—</span>}</td>
                <td>
                  <div className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                    <Button variant="ghost" size="sm" icon={<IconEdit size={11} />} onClick={() => startEdit(row)} />
                    <Button variant="ghost" size="sm" icon={<IconTrash size={11} />} onClick={() => deleteRow(row.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {formPanel}
    </Card>
  );
}

// ── Placeholder for not-yet-built tabs ───────────────────────────────────────
function EmptyTab({ label }) {
  return (
    <Card>
      <Empty title={`${label} belum tersedia`} sub="Modul ini sedang dibangun ulang — segera hadir." />
    </Card>
  );
}

// ── Left-rail tab definitions ────────────────────────────────────────────────
const TABS = [
  { key: "dokumen", label: "EMKL",                  icon: IcDoc },
  { key: "invoice", label: "Invoice",               icon: IcList },
  { key: "piutang", label: "Piutang",               icon: IcMoney },
  { key: "hutang",  label: "Hutang",                icon: IcMoney },
  { key: "pajak",   label: "Pajak & Reimbursement", icon: IcList },
];
const VALID_TABS = TABS.map(t => t.key);

// ── Main component ────────────────────────────────────────────────────────────
export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [showDelete, setShowDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return VALID_TABS.includes(t) ? t : "dokumen";
  });

  const { data: bookingData, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get(`/bookings/${id}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/bookings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["buku"] });
      toast('Booking berhasil dihapus.');
      navigate(location.state?.buku_id ? `/buku/${location.state.buku_id}` : "/");
    },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus booking.'), 'error'),
  });

  if (isLoading) return <BookingDetailSkeleton />;
  if (!bookingData) return <div className="empty"><div className="empty__title" style={{ color: "var(--danger)" }}>Booking tidak ditemukan.</div></div>;

  const { booking, containers } = bookingData;

  const bukuState = location.state ?? {};
  const bukuPeriodeLabel = (() => {
    const p = bukuState.buku_periode;
    if (!p) return null;
    const [y, m] = p.split("/");
    return `${monthLabel(parseInt(m))} ${y}`;
  })();
  const crumbs = [
    { label: "Buku", onClick: () => navigate("/") },
    ...(bukuState.buku_id ? [{ label: bukuPeriodeLabel ?? bukuState.buku_periode, onClick: () => navigate(`/buku/${bukuState.buku_id}`) }] : []),
    { label: booking.job_no },
  ];

  function fmtCtr(ctrs) {
    const counts = {};
    for (const c of ctrs) counts[c.size] = (counts[c.size] ?? 0) + 1;
    const parts = Object.entries(counts).map(([s, n]) => `${n}× ${s}`);
    return `${ctrs.length} container${ctrs.length !== 1 ? "s" : ""}${parts.length ? ` (${parts.join(", ")})` : ""}`;
  }

  const onEdit = () => navigate(`/bookings/${id}/edit`, { state: bukuState });

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={<><span className="mono">{booking.job_no}</span><span className="muted" style={{ fontWeight: 400, fontSize: 18 }}> · {booking.commodity}</span></>}
        meta={
          <span className="row" style={{ gap: 10 }}>
            <span>{booking.shipper || "—"}</span>
            <span className="dim">•</span>
            <span>{booking.vessel_name || "—"}{booking.vessel_no ? ` / ${booking.vessel_no}` : ""}</span>
            <span className="dim">•</span>
            <span>{fmtCtr(containers)}</span>
          </span>
        }
        actions={
          <div className="row" style={{ gap: 8 }}>
            {showDelete ? (
              <>
                <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Yakin hapus?</span>
                <Button variant="danger" size="sm" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>Hapus</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>Batal</Button>
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <Button variant="default" icon={<IconMore size={14} />} onClick={() => setShowMenu(v => !v)} />
                {showMenu && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setShowMenu(false)} />
                    <div className="action-menu">
                      <button className="action-menu__item" onClick={() => { setShowMenu(false); onEdit(); }}>
                        <IconEdit size={13} /> Edit Booking
                      </button>
                      <div className="action-menu__divider" />
                      <button className="action-menu__item action-menu__item--danger" onClick={() => { setShowMenu(false); setShowDelete(true); }}>
                        <IconTrash size={13} /> Hapus Booking
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        }
      />

      {/* Booking core — always visible above tabs */}
      <div className="col" style={{ gap: 16, marginBottom: 18 }}>
        <div className="grid grid-2">
          <IdentitasCard booking={booking} bookingPublicId={id} />
          <PelayaranCard booking={booking} bookingPublicId={id} />
        </div>
        <JadwalTruckingTable bookingPublicId={id} initialContainers={containers} lokasiMuat={booking.lokasi_muat} />
      </div>

      {/* PeopleSoft-style left rail + panel */}
      <div className="bd-detail">
        <nav className="bd-railtabs" role="tablist" aria-label="Booking sections">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`bd-rail-tab${tab === key ? " is-active" : ""}`}
              onClick={() => setTab(key)}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="bd-railpanel">
          {tab === "dokumen" && <BookingDocuments bookingId={id} canEdit={true} />}
          {tab === "invoice" && <EmptyTab label="Invoice" />}
          {tab === "piutang" && <EmptyTab label="Piutang" />}
          {tab === "hutang"  && <EmptyTab label="Hutang" />}
          {tab === "pajak"   && <EmptyTab label="Pajak & Reimbursement" />}
        </div>
      </div>
    </>
  );
}
