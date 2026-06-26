import { useState, useEffect, useRef, Fragment } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import { useAuth } from "../hooks/useAuth.js";
import { BookingDetailSkeleton } from "../components/Skeleton.jsx";
import { useToast } from "../components/Toast.jsx";
import { Badge, Button, Card, PageHeader, Empty, Modal, Field, Input, Select, Progress, fmtRp, fmtDate, monthLabel, RpCell } from "../components/ui.jsx";
import { IconEdit, IconTrash, IconPlus, IconChevron, IconMore } from "../components/Icons.jsx";
import { exportBookingInvoice, exportInvoiceOnly, exportInvoicePajak, exportNotaReimbursement } from "../utils/invoicePdf.js";
import BookingDocuments from "./BookingDocuments.jsx";

function apiErrMsg(e, fallback) {
  const err = e?.response?.data?.error;
  if (err === 'buku_closed') return 'Buku sudah ditutup, tidak dapat diedit.';
  return err ?? fallback;
}

// ── Inline icons used by the new design (kept local to avoid touching Icons.jsx) ──
const I = ({ children, size = 14, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);
const IcBox  = (p) => <I {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></I>;
const IcList = (p) => <I {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></I>;
const IcDown = (p) => <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></I>;
const IcUp   = (p) => <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></I>;



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

// ── Container card grid ──────────────────────────────────────────────────────
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

  useEffect(() => {
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
  }, [booking, editing]);

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
        <Field label="Lokasi Muat"><Input value={form.lokasi_muat} onChange={set("lokasi_muat")} placeholder="Lokasi pemuatan" /></Field>
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

  useEffect(() => {
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
  }, [booking, editing]);

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

const EMPTY_CTR_FORM = () => ({ container_no: "", seal_no: "", size: "40ft", container_no_2: "", seal_no_2: "", no_sp: "", trucking: "", biaya_trucking: "", in_date: "", out_date: "", notes: "" });

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{children}</div>;
}

function JadwalTruckingTable({ bookingPublicId, initialContainers }) {
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
    const payload = { ...form, biaya_trucking: form.biaya_trucking !== "" ? parseInt(form.biaya_trucking) : null };
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
            <Select value={form.size} onChange={setF("size")}>
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
          <Field label="Trucking"><Input value={form.trucking} onChange={setF("trucking")} /></Field>
          <Field label="Biaya Trucking"><Input type="number" value={form.biaya_trucking} onChange={setF("biaya_trucking")} placeholder="0" /></Field>
        </div>
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
              <th style={{ width: 100 }}>In Date</th>
              <th style={{ width: 100 }}>Out Date</th>
              <th>Notes</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={11} style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
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

// ── Modals ────────────────────────────────────────────────────────────────────

function PaymentModal({ open, onClose, label, onSave, isPending, initialData }) {
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [jumlah, setJumlah] = useState("");
  const [metode, setMetode] = useState("transfer");
  const [keterangan, setKeterangan] = useState("");
  useEffect(() => {
    if (open) {
      setTanggal(initialData?.tanggal ?? new Date().toISOString().slice(0, 10));
      setJumlah(initialData?.jumlah ?? "");
      setMetode(initialData?.metode ?? "transfer");
      setKeterangan(initialData?.keterangan ?? "");
    }
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={label ?? "Tambah Pembayaran"}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!jumlah || isPending} onClick={() => onSave({ tanggal, jumlah: +jumlah, metode, keterangan })}>Simpan</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid grid-form-2">
          <Field label="Tanggal" required><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></Field>
          <Field label="Jumlah (Rp)" required><Input type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} /></Field>
          <Field label="Metode" required>
            <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
              <option value="giro">Giro</option>
              <option value="lainnya">Lainnya</option>
            </Select>
          </Field>
          <Field label="Keterangan"><Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="opsional" /></Field>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-2)", display: "flex", justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 12 }}>Jumlah</span>
          <span className="num strong" style={{ fontSize: 16 }}>{fmtRp(+(jumlah) || 0)}</span>
        </div>
      </div>
    </Modal>
  );
}

function LineItemModal({ open, onClose, item, onSave, isPending }) {
  const [tipe, setTipe] = useState("");
  const [qty, setQty] = useState(1);
  const [harga, setHarga] = useState("");
  useEffect(() => { if (open && item) { setTipe(item.tipe || ""); setQty(item.qty || 1); setHarga(item.harga_satuan ?? ""); } }, [open, item]);
  const subtotal = qty * harga;
  return (
    <Modal open={open} onClose={onClose} title={item?.id ? "Edit Line Item" : "Add Line Item"}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!tipe || !harga || isPending} onClick={() => onSave({ tipe, qty: +qty, harga_satuan: +harga })}>{item?.id ? "Save" : "Add"}</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <Field label="Uraian (Deskripsi biaya)" required><Input value={tipe} onChange={(e) => setTipe(e.target.value)} placeholder="Biaya Handling Container 40ft" /></Field>
        <div className="grid grid-form-2">
          <Field label="Qty" required><Input type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} /></Field>
          <Field label="Harga Satuan (Rp)" required><Input type="number" min={0} value={harga} onChange={(e) => setHarga(e.target.value)} placeholder="0" /></Field>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-2)", display: "flex", justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 12 }}>Subtotal</span>
          <span className="num strong" style={{ fontSize: 16 }}>{fmtRp(subtotal)}</span>
        </div>
      </div>
    </Modal>
  );
}

function PiutangSetModal({ open, onClose, currentAmount, invoiceTotal, onSave, isPending }) {
  const [jumlah, setJumlah] = useState("");
  useEffect(() => { if (open) { setJumlah(currentAmount || ""); } }, [open, currentAmount]);
  return (
    <Modal open={open} onClose={onClose} title="Set Piutang Manual"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={isPending || !jumlah} onClick={() => onSave({ jumlah: +jumlah })}>Simpan</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <Field label="Jumlah Piutang (Rp)" required><Input type="number" min={0} value={jumlah} onChange={(e) => setJumlah(e.target.value)} /></Field>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-2)", display: "flex", justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 12 }}>Jumlah{invoiceTotal > 0 ? <> · invoice: <strong className="num">{fmtRp(invoiceTotal)}</strong></> : null}</span>
          <span className="num strong" style={{ fontSize: 16 }}>{fmtRp(+(jumlah) || 0)}</span>
        </div>
      </div>
    </Modal>
  );
}

function HutangFormModal({ open, onClose, onSave, isPending }) {
  const [pihak, setPihak] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  useEffect(() => { if (open) { setPihak(""); setJumlah(""); setKeterangan(""); } }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Tambah Hutang Vendor"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!pihak || !jumlah || isPending} onClick={() => onSave({ pihak, jumlah: +jumlah, keterangan })}>Tambah</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div className="grid grid-form-2">
          <Field label="Pihak / Vendor" required span={2}><Input value={pihak} onChange={(e) => setPihak(e.target.value)} placeholder="Nama vendor" /></Field>
          <Field label="Jumlah (Rp)" required><Input type="number" min={1} value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="0" /></Field>
          <Field label="Keterangan"><Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></Field>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-2)", display: "flex", justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 12 }}>Jumlah</span>
          <span className="num strong" style={{ fontSize: 16 }}>{fmtRp(+(jumlah) || 0)}</span>
        </div>
      </div>
    </Modal>
  );
}

function TruckingPaymentModal({ open, onClose, hutang, onSave, isPending, editPay }) {
  const [noVoucher, setNoVoucher] = useState("");
  const [pelunasan, setPelunasan] = useState("");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [metode, setMetode] = useState("transfer");

  useEffect(() => {
    if (open) {
      if (editPay) {
        setNoVoucher(editPay.no_voucher ?? "");
        setPelunasan(String(editPay.jumlah));
        setTanggal(editPay.tanggal ?? new Date().toISOString().slice(0, 10));
        setMetode(editPay.metode ?? "transfer");
      } else {
        setNoVoucher("");
        setPelunasan("");
        setTanggal(new Date().toISOString().slice(0, 10));
        setMetode("transfer");
      }
    }
  }, [open, editPay]);

  const total = hutang?.jumlah ?? 0;
  const alreadyPaid = hutang?.total_paid ?? 0;
  // For edit: restore this payment's amount so sisa reflects "before this payment"
  const sisaSebelum = editPay
    ? Math.max(0, total - (alreadyPaid - editPay.jumlah))
    : Math.max(0, total - alreadyPaid);
  const pelNum = +(pelunasan) || 0;
  const pelOver = !editPay && pelNum > sisaSebelum && pelNum > 0;
  const sisaSetelah = Math.max(0, sisaSebelum - pelNum);
  const canSubmit = pelunasan && tanggal && !isPending && !pelOver;

  return (
    <Modal open={open} onClose={onClose} title={editPay ? "Edit Pembayaran" : "Bayar Hutang Trucking"}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!canSubmit} onClick={() => onSave({ noVoucher, pelunasan, tanggal, metode })}>Simpan</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-2)", fontSize: 12 }}>
          <div className="kv-grid" style={{ gap: "4px 16px" }}>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Cont No.</div><div className="kv-grid__val mono">{hutang?.container_no || "—"}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Trucking</div><div className="kv-grid__val">{hutang?.pihak || "—"}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Size</div><div className="kv-grid__val">{hutang?.size || "—"}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">No. SP</div><div className="kv-grid__val">{hutang?.no_sp || "—"}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Total</div><div className="kv-grid__val num strong">{fmtRp(total)}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Sisa</div><div className={`kv-grid__val num ${sisaSebelum > 0 ? "warn" : "ok"}`}>{fmtRp(sisaSebelum)}</div></div>
          </div>
        </div>
        <div className="grid grid-form-2">
          <Field label="No. Voucher" span={2}><Input value={noVoucher} onChange={(e) => setNoVoucher(e.target.value)} placeholder="opsional" /></Field>
          <Field label="Pelunasan (Rp)" required>
            <Input type="number" min={1} value={pelunasan} onChange={(e) => setPelunasan(e.target.value)} placeholder="0"
              style={pelOver ? { borderColor: "var(--danger, #e53e3e)", outline: "none", boxShadow: "0 0 0 2px rgba(229,62,62,.15)" } : {}} />
            {pelOver && <span style={{ fontSize: 11, color: "var(--danger, #e53e3e)", marginTop: 4, display: "block" }}>Melebihi sisa hutang ({fmtRp(sisaSebelum)})</span>}
          </Field>
          <Field label="Tanggal" required><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></Field>
          <Field label="Metode" required>
            <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
              <option value="giro">Giro</option>
              <option value="lainnya">Lainnya</option>
            </Select>
          </Field>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="muted" style={{ fontSize: 11 }}>Sisa setelah pembayaran</span>
            <span className={`num strong ${sisaSetelah > 0 ? "warn" : "ok"}`} style={{ fontSize: 16 }}>{fmtRp(sisaSetelah)}</span>
          </div>
          <div className="col" style={{ gap: 2, textAlign: "right" }}>
            <span className="muted" style={{ fontSize: 11 }}>Pelunasan</span>
            <span className={`num strong ${pelOver ? "" : ""}`} style={{ fontSize: 16, color: pelOver ? "var(--danger, #e53e3e)" : undefined }}>{fmtRp(pelNum)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function BulkTruckingPayModal({ open, onClose, hutangList, onSave, isPending }) {
  const [noVoucher, setNoVoucher] = useState("");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [metode, setMetode] = useState("transfer");

  const total = hutangList.reduce((s, h) => s + (h.sisa ?? 0), 0);
  const canSubmit = tanggal && !isPending && hutangList.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Bayar Hutang Trucking (Terpilih)"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!canSubmit} onClick={() => onSave({ noVoucher, tanggal, metode })}>Simpan</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div style={{ borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-2)", color: "var(--fg-3)" }}>
                <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 500 }}>Container</th>
                <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 500 }}>Trucking</th>
                <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 500 }}>Sisa</th>
              </tr>
            </thead>
            <tbody>
              {hutangList.map((h, i) => (
                <tr key={h.id} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  <td style={{ padding: "6px 10px" }} className="mono">{h.container_no || "—"}</td>
                  <td style={{ padding: "6px 10px" }}>{h.pihak || "—"}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }} className="num warn">{fmtRp(h.sisa ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", background: "var(--bg-2)" }}>
                <td colSpan={2} style={{ padding: "6px 10px", fontWeight: 600, fontSize: 12 }}>Total</td>
                <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }} className="num">{fmtRp(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grid grid-form-2">
          <Field label="No. Voucher" span={2}><Input value={noVoucher} onChange={(e) => setNoVoucher(e.target.value)} placeholder="opsional" /></Field>
          <Field label="Tanggal" required><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></Field>
          <Field label="Metode" required>
            <Select value={metode} onChange={(e) => setMetode(e.target.value)}>
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
              <option value="giro">Giro</option>
              <option value="lainnya">Lainnya</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function HutangTypeModal({ open, onClose, onSelectVendor }) {
  return (
    <Modal open={open} onClose={onClose} title="Tambah Hutang">
      <div className="col" style={{ gap: 10 }}>
        <button onClick={() => { onClose(); onSelectVendor(); }}
          style={{ textAlign: "left", padding: "14px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-1)", cursor: "pointer", transition: "background 0.15s" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-1)"}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--fg)", marginBottom: 2 }}>Hutang Vendor</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Catat tagihan dari vendor secara manual</div>
        </button>
        <div style={{ padding: "14px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-2)", opacity: 0.6 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--fg)", marginBottom: 2 }}>Hutang Trucking</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Otomatis dibuat dari data Jadwal Trucking</div>
        </div>
      </div>
    </Modal>
  );
}

// ── Finance tab panels ───────────────────────────────────────────────────────
function ShipmentTabPanel({ booking, containers, bookingPublicId }) {
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid grid-2">
        <IdentitasCard booking={booking} bookingPublicId={bookingPublicId} />
        <PelayaranCard booking={booking} bookingPublicId={bookingPublicId} />
      </div>
      <JadwalTruckingTable bookingPublicId={bookingPublicId} initialContainers={containers} />
    </div>
  );
}

function InvoiceTabPanel({ dokumen, invoiceTotal, setItemModal, deleteItemMutation, onExportInvoice }) {
  return (
    <Card pad={false}>
      <div className="bd-invoice-bar">
        <div className="bd-invoice-bar__total">
          <span>Total Invoice</span>
          <b>{fmtRp(invoiceTotal)}</b>
          <span className="muted" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 12.5 }}>· {dokumen.length} line item</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button variant="default" size="sm" disabled={dokumen.length === 0} onClick={onExportInvoice}>Download Invoice</Button>
          <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setItemModal({ tipe: "", qty: 1, harga_satuan: "" })}>Tambah Line Item</Button>
        </div>
      </div>
      <div className="tbl-wrap"><table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 50 }}>#</th>
            <th>Uraian</th>
            <th style={{ width: 70 }}>Qty</th>
            <th style={{ width: 130 }}>Harga Satuan</th>
            <th style={{ width: 130 }}>Subtotal</th>
            <th style={{ width: 70 }} />
          </tr>
        </thead>
        <tbody>
          {dokumen.map((d, i) => (
            <tr key={d.id}>
              <td className="num muted">{String(i + 1).padStart(2, "0")}</td>
              <td className="strong">{d.tipe}</td>
              <td className="right num">{d.qty}</td>
              <RpCell value={d.harga_satuan ?? 0} />
              <RpCell value={d.biaya ?? 0} strong />
              <td>
                <div className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                  <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => setItemModal({ id: d.id, tipe: d.tipe, qty: d.qty, harga_satuan: d.harga_satuan })} />
                  <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => deleteItemMutation.mutate(d.id)} />
                </div>
              </td>
            </tr>
          ))}
          {dokumen.length === 0 && <tr><td colSpan={6}><Empty title="Belum ada line item" sub="Tambahkan biaya yang akan ditagih ke shipper." /></td></tr>}
        </tbody>
        {dokumen.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: "right", paddingRight: 24, color: "var(--fg-3)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11 }}>Total</td>
              <RpCell value={invoiceTotal} strong style={{ fontSize: 16, color: "var(--fg)" }} />
              <td />
            </tr>
          </tfoot>
        )}
      </table></div>
    </Card>
  );
}

function PiutangTabPanel({ piutang, piutangPaid, piutangSisa, piutangSt, invoiceTotal, setPiutangMutation, setPiutangModal, setPayModal, deletePiutangPayMutation, deletePiutangMutation }) {
  const pct = piutang && piutang.jumlah > 0 ? Math.round((piutangPaid / piutang.jumlah) * 100) : 0;

  useEffect(() => {
    if (invoiceTotal > 0 && !piutang && !setPiutangMutation.isPending) {
      setPiutangMutation.mutate({ jumlah: invoiceTotal });
    } else if (invoiceTotal === 0 && piutang && !deletePiutangMutation.isPending) {
      deletePiutangMutation.mutate();
    }
  }, [invoiceTotal]);

  return (
    <>
      <div className="bd-money-hero">
        <div>
          <div className="bd-money-hero__lbl">Total Piutang</div>
          <div className="bd-money-hero__val">{fmtRp(piutang?.jumlah ?? 0)}</div>
          <div className="bd-money-hero__sub">{piutang?.pembayaran?.length ?? 0} pembayaran</div>
        </div>
        <div>
          <div className="bd-money-hero__lbl">Sudah Dibayar</div>
          <div className="bd-money-hero__val ok">{fmtRp(piutangPaid)}</div>
          <div className="bd-money-hero__sub">{piutang?.pembayaran?.length ?? 0} pembayaran · {pct}% dari total</div>
        </div>
        <div>
          <div className="bd-money-hero__lbl">Sisa Tagihan</div>
          <div className={`bd-money-hero__val ${piutangSisa > 0 ? "warn" : "ok"}`}>{fmtRp(piutangSisa)}</div>
          <div className="bd-money-hero__sub">{piutangSisa <= 0 ? "Sudah lunas" : "Belum tertagih"}</div>
        </div>
      </div>

      <Card pad={false}>
        <div className="bd-invoice-bar">
          <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>Progress</span>
            <div style={{ minWidth: 200, flex: 1, maxWidth: 360 }}>
              <Progress value={piutangPaid} max={piutang?.jumlah || 1} tone={piutangSt === "lunas" ? "ok" : piutangSt === "sebagian" ? "warn" : "danger"} />
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{fmtRp(piutangPaid)} / {fmtRp(piutang?.jumlah ?? 0)}</span>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {/* hidden — auto-set from invoice on load */}
            <Button variant="default" size="sm" onClick={() => setPiutangMutation.mutate({ jumlah: invoiceTotal })} disabled={!invoiceTotal || setPiutangMutation.isPending} style={{ display: "none" }}>Set dari Invoice</Button>
            <Button variant="default" size="sm" onClick={() => setPiutangModal(true)} style={{ display: "none" }}>Set Manual</Button>
            <Button variant="primary" size="sm" icon={<IconPlus size={12} />} disabled={!piutang} onClick={() => setPayModal({ kind: "piutang", label: "Tambah Pembayaran Piutang", sisa: piutangSisa })}>Tambah Pembayaran</Button>
          </div>
        </div>

        {piutang?.pembayaran?.length > 0 ? (
          <div className="tbl-wrap"><table className="pay-tbl">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th style={{ width: 120 }}>Tanggal</th>
                <th>Metode</th>
                <th>Keterangan</th>
                <th style={{ width: 130 }}>Jumlah</th>
                <th style={{ width: 70 }} />
              </tr>
            </thead>
            <tbody>
              {piutang.pembayaran.map((p, i) => (
                <tr key={p.id}>
                  <td className="num muted">{String(i + 1).padStart(2, "0")}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.tanggal)}</td>
                  <td><span className="method-pill">{p.metode}</span></td>
                  <td className={p.keterangan ? "" : "muted"}>{p.keterangan || "—"}</td>
                  <RpCell value={p.jumlah} strong />
                  <td>
                    <div className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                      <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => setPayModal({ kind: "piutang", label: "Edit Pembayaran Piutang", editPayId: p.id, initialData: p })} />
                      <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => deletePiutangPayMutation.mutate(p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <div style={{ padding: "32px 16px" }}>
            {piutang
              ? <Empty title="Belum ada pembayaran" sub="Rekam pembayaran ketika dana masuk dari shipper." />
              : <Empty title="Belum ada piutang" sub={invoiceTotal > 0 ? `Klik "Set dari Invoice" untuk menetapkan tagihan sebesar ${fmtRp(invoiceTotal)}.` : "Tambahkan line items di tab Invoice terlebih dahulu."} />}
          </div>
        )}
      </Card>
    </>
  );
}

function HutangTabPanel({ hutangList, setHutangTypeModal, setPayModal, setTruckingPayModal, deleteHutangMutation, deleteHutangPayMutation, setEditTruckingPay, setBulkTruckingModal }) {
  const [expandedTruckingId, setExpandedTruckingId] = useState(null);
  const [selectedTrucking, setSelectedTrucking] = useState(new Set());
  const truckingHutang = hutangList.filter(h => h.hutang_type === 'trucking');
  const vendorHutang = hutangList.filter(h => h.hutang_type !== 'trucking');

  const totals = hutangList.reduce((acc, h) => {
    const paid = h.total_paid ?? 0;
    acc.total += h.jumlah; acc.paid += paid; acc.sisa += h.sisa ?? (h.jumlah - paid);
    return acc;
  }, { total: 0, paid: 0, sisa: 0 });
  const payCount = hutangList.reduce((a, h) => a + (h.pembayaran?.length ?? 0), 0);

  const selectableTrucking = truckingHutang.filter(h => (h.sisa ?? 0) > 0);
  const allChecked = selectableTrucking.length > 0 && selectableTrucking.every(h => selectedTrucking.has(h.id));
  const toggleSelectAll = () => {
    if (allChecked) setSelectedTrucking(new Set());
    else setSelectedTrucking(new Set(selectableTrucking.map(h => h.id)));
  };
  const toggleOne = (id) => setSelectedTrucking(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <>
      <div className="bd-money-hero">
        <div>
          <div className="bd-money-hero__lbl">Total Hutang</div>
          <div className="bd-money-hero__val">{fmtRp(totals.total)}</div>
          <div className="bd-money-hero__sub">{hutangList.length} entri</div>
        </div>
        <div>
          <div className="bd-money-hero__lbl">Sudah Dibayar</div>
          <div className="bd-money-hero__val ok">{fmtRp(totals.paid)}</div>
          <div className="bd-money-hero__sub">{payCount} pembayaran</div>
        </div>
        <div>
          <div className="bd-money-hero__lbl">Sisa Hutang</div>
          <div className={`bd-money-hero__val ${totals.sisa > 0 ? "warn" : "ok"}`}>{fmtRp(totals.sisa)}</div>
          <div className="bd-money-hero__sub">{totals.sisa <= 0 ? "Semua lunas" : "Belum dibayar"}</div>
        </div>
      </div>

      {/* Section A: Hutang Trucking */}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10, marginTop: 4, gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 13, color: "var(--fg-2)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Hutang Trucking</h3>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          {selectedTrucking.size > 0 && (
            <Button variant="primary" size="sm" onClick={() => setBulkTruckingModal(truckingHutang.filter(h => selectedTrucking.has(h.id)))}>
              Bayar Terpilih ({selectedTrucking.size})
            </Button>
          )}
          <span className="muted" style={{ fontSize: 11 }}>Otomatis dari Jadwal Trucking · klik baris untuk detail</span>
        </div>
      </div>
      <Card pad={false} style={{ marginBottom: 20 }}>
        <div className="tbl-wrap" style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: "center" }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleSelectAll} disabled={selectableTrucking.length === 0} />
                </th>
                <th style={{ width: 36 }}>#</th>
                <th>Cont No.</th>
                <th>Seal No.</th>
                <th style={{ width: 70 }}>Size</th>
                <th>No. SP</th>
                <th>Trucking</th>
                <th style={{ width: 130 }}>Biaya Trucking</th>
                <th style={{ width: 100 }}>In Date</th>
                <th style={{ width: 100 }}>Out Date</th>
                <th>Notes</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {truckingHutang.length === 0 && (
                <tr><td colSpan={13} style={{ padding: "32px 16px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                  Belum ada hutang trucking — tambahkan data di tab Shipment
                </td></tr>
              )}
              {truckingHutang.map((h, i) => {
                const isExpanded = expandedTruckingId === h.id;
                const isSelectable = (h.sisa ?? 0) > 0;
                const isChecked = selectedTrucking.has(h.id);
                return (
                  <Fragment key={h.id}>
                    <tr
                      style={{ cursor: "pointer", background: isExpanded ? "var(--bg-2)" : "", borderLeft: isExpanded ? "3px solid var(--primary, #3b82f6)" : "3px solid transparent" }}
                      onClick={() => setExpandedTruckingId(isExpanded ? null : h.id)}
                      onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "var(--bg-2)"; }}
                      onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = ""; }}>
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isChecked} disabled={!isSelectable}
                          onChange={() => toggleOne(h.id)}
                          style={{ opacity: isSelectable ? 1 : 0.3, cursor: isSelectable ? "pointer" : "not-allowed" }} />
                      </td>
                      <td className="muted num" style={{ fontSize: 11, textAlign: "center" }}>{String(i + 1).padStart(2, "0")}</td>
                      <td className="mono">{h.container_no || <span className="dim">—</span>}</td>
                      <td className="mono">{h.seal_no || <span className="dim">—</span>}</td>
                      <td>{h.size || <span className="dim">—</span>}</td>
                      <td>{h.no_sp || <span className="dim">—</span>}</td>
                      <td>{h.pihak || <span className="dim">—</span>}</td>
                      <td className="num">{fmtRp(h.jumlah)}</td>
                      <td>{h.cont_in_date ? fmtDate(h.cont_in_date) : <span className="dim">—</span>}</td>
                      <td>{h.cont_out_date ? fmtDate(h.cont_out_date) : <span className="dim">—</span>}</td>
                      <td>{h.cont_notes || <span className="dim">—</span>}</td>
                      <td><Badge status={h.status} /></td>
                      <td style={{ textAlign: "center", color: "var(--fg-3)" }}>
                        <IconChevron size={12} style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={13} style={{ padding: "14px 18px 14px 20px", background: "var(--bg-1)", borderBottom: "2px solid var(--border)", borderLeft: "3px solid var(--primary, #3b82f6)" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                            Riwayat Pembayaran
                          </div>
                          {h.pembayaran && h.pembayaran.length > 0 ? (
                            <div style={{ marginBottom: 12, borderRadius: 6, border: "1px solid var(--border)", overflow: "hidden" }}>
                              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ background: "var(--bg-2)", color: "var(--fg-3)" }}>
                                    <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 500 }}>Tanggal</th>
                                    <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 500 }}>Metode</th>
                                    <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 500 }}>No. Voucher</th>
                                    <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 500 }}>Jumlah</th>
                                    <th style={{ width: 64, padding: "6px 10px" }} />
                                  </tr>
                                </thead>
                                <tbody>
                                  {h.pembayaran.map((p, pi) => (
                                    <tr key={p.id} style={{ borderTop: pi > 0 ? "1px solid var(--border)" : "none" }}>
                                      <td style={{ padding: "6px 10px" }}>{fmtDate(p.tanggal)}</td>
                                      <td style={{ padding: "6px 10px", textTransform: "capitalize" }}>{p.metode}</td>
                                      <td style={{ padding: "6px 10px" }} className="mono">{p.no_voucher || <span className="dim">—</span>}</td>
                                      <td style={{ padding: "6px 10px", textAlign: "right" }} className="num">{fmtRp(p.jumlah)}</td>
                                      <td style={{ padding: "4px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                                        <Button variant="ghost" size="sm" icon={<IconEdit size={11} />}
                                          onClick={(e) => { e.stopPropagation(); setEditTruckingPay({ hutang: h, pay: p }); }} />
                                        <Button variant="ghost" size="sm" icon={<IconTrash size={11} />}
                                          onClick={(e) => { e.stopPropagation(); deleteHutangPayMutation.mutate({ hutangId: h.id, payId: p.id }); }} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 12, fontStyle: "italic" }}>Belum ada pembayaran.</div>
                          )}
                          {h.sisa > 0 && (
                            <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); setTruckingPayModal(h); }}>Bayar</Button>
                          )}
                          {h.sisa <= 0 && (
                            <span style={{ fontSize: 12, color: "var(--ok, #38a169)", fontWeight: 600 }}>✓ Lunas</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section B: Hutang Vendor */}
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, color: "var(--fg-2)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Hutang Vendor</h3>
        <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setHutangTypeModal(true)}>Tambah Hutang</Button>
      </div>

      {vendorHutang.length === 0 ? (
        <Card><Empty title="Belum ada hutang vendor" sub="Catat tagihan dari vendor (pelabuhan, dll)." /></Card>
      ) : (
        <div className="bd-hutang-grid">
          {vendorHutang.map((h) => {
            const paid = h.total_paid ?? 0;
            const sisa = h.sisa ?? (h.jumlah - paid);
            const st = h.status;
            return (
              <div key={h.id} className="bd-vendor-card">
                <div className="bd-vendor-card__hd">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="bd-vendor-card__name">{h.pihak}</div>
                    {h.keterangan && <div className="bd-vendor-card__note">{h.keterangan}</div>}
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <Badge status={st} />
                    <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => deleteHutangMutation.mutate(h.id)} />
                  </div>
                </div>
                <div className="bd-vendor-card__body">
                  <div className="bd-vendor-card__amt"><small>Total</small><b>{fmtRp(h.jumlah)}</b></div>
                  <div className="bd-vendor-card__amt"><small>Sisa</small><b className={sisa > 0 ? "warn" : "ok"}>{fmtRp(sisa)}</b></div>
                  <Progress value={paid} max={h.jumlah || 1} tone={st === "lunas" ? "ok" : st === "sebagian" ? "warn" : "danger"} />
                  {h.pembayaran?.length > 0 && (
                    <div className="bd-vendor-card__pays">
                      {h.pembayaran.map((p) => (
                        <div key={p.id} className="bd-vendor-card__pay">
                          <div>
                            <span className="bd-vendor-card__pay-date">{fmtDate(p.tanggal)}</span>
                            <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>· {p.metode}</span>
                          </div>
                          <span className="bd-vendor-card__pay-amt">{fmtRp(p.jumlah)}</span>
                          <div className="row" style={{ gap: 2 }}>
                            <Button variant="ghost" size="sm" icon={<IconEdit size={11} />} onClick={() => setPayModal({ kind: "hutang", label: "Edit Pembayaran Hutang", hutangId: h.id, sisa, editPayId: p.id, initialData: p })} />
                            <Button variant="ghost" size="sm" icon={<IconTrash size={11} />} onClick={() => deleteHutangPayMutation.mutate({ hutangId: h.id, payId: p.id })} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bd-vendor-card__ft">
                  <span className="muted" style={{ fontSize: 11 }}>{h.pembayaran?.length ?? 0} pembayaran tercatat</span>
                  <Button variant="ghost" size="sm" icon={<IconPlus size={12} />} onClick={() => setPayModal({ kind: "hutang", label: "Tambah Pembayaran Hutang", hutangId: h.id, sisa })}>Bayar</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function InvoicePajakItemModal({ open, onClose, item, onSave, isPending }) {
  const [keterangan, setKeterangan] = useState(item?.keterangan ?? "");
  const [harga, setHarga] = useState(item?.harga ?? "");
  return (
    <Modal open={open} onClose={onClose} title={item?.id ? "Edit Item Pajak" : "Tambah Item Pajak"}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!keterangan || !harga || isPending} onClick={() => onSave({ keterangan, harga: +harga })}>{item?.id ? "Simpan" : "Tambah"}</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <Field label="Keterangan" required><Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="FREIGHT CHARGES" /></Field>
        <Field label="Harga (Rp)" required><Input type="number" min={0} value={harga} onChange={(e) => setHarga(e.target.value)} placeholder="0" /></Field>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-2)", display: "flex", justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 12 }}>Amount</span>
          <span className="num strong" style={{ fontSize: 16 }}>{fmtRp(+(harga) || 0)}</span>
        </div>
      </div>
    </Modal>
  );
}

function ReimbursementItemModal({ open, onClose, item, onSave, isPending }) {
  const [description, setDescription] = useState(item?.description ?? "");
  const [qty, setQty] = useState(item?.qty ?? 1);
  const [price, setPrice] = useState(item?.price ?? "");
  const amount = qty * (price || 0);
  return (
    <Modal open={open} onClose={onClose} title={item?.id ? "Edit Item Reimbursement" : "Tambah Item Reimbursement"}
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!description || !price || isPending} onClick={() => onSave({ description, qty: +qty, price: +price })}>{item?.id ? "Simpan" : "Tambah"}</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <Field label="Description" required><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Port Charges" /></Field>
        <div className="grid grid-form-2">
          <Field label="Qty" required><Input type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} /></Field>
          <Field label="Price (Rp)" required><Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></Field>
        </div>
        <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-2)", display: "flex", justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 12 }}>Amount</span>
          <span className="num strong" style={{ fontSize: 16 }}>{fmtRp(amount)}</span>
        </div>
      </div>
    </Modal>
  );
}

function ReconciliationBanner({ invoiceTotal, pajakTotal, reimbTotal }) {
  const gabungan = pajakTotal + reimbTotal;
  const ok = gabungan === invoiceTotal;
  const selisih = Math.abs(gabungan - invoiceTotal);
  return (
    <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, background: ok ? "var(--bg-2)" : "color-mix(in srgb, var(--warn) 10%, var(--bg-1))", border: `1px solid ${ok ? "var(--border)" : "var(--warn)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="col" style={{ gap: 4, fontSize: 12 }}>
          <div className="row" style={{ gap: 8 }}><span className="muted">Total Invoice (tab Invoice)</span><span className="num">{fmtRp(invoiceTotal)}</span></div>
          <div className="row" style={{ gap: 8 }}><span className="muted">Invoice Pajak (Nilai Penyerahan)</span><span className="num">{fmtRp(pajakTotal)}</span></div>
          <div className="row" style={{ gap: 8 }}><span className="muted">Reimbursement</span><span className="num">{fmtRp(reimbTotal)}</span></div>
          <div className="row" style={{ gap: 8, fontWeight: 600 }}><span>Gabungan</span><span className="num">{fmtRp(gabungan)}</span></div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: ok ? "var(--ok)" : "var(--warn)" }}>
          {ok ? "✓ Sesuai" : `⚠ Selisih ${fmtRp(selisih)}`}
        </div>
      </div>
    </div>
  );
}

function InvoicePajakTabPanel({ booking, invoicePajak, invoiceTotal, reimbTotal, onCreate, onDelete, setPajakItemModal, deleteItemMutation }) {
  const items = invoicePajak?.items ?? [];
  const tvp = invoicePajak?.total_nilai_penyerahan ?? 0;
  const ppn = invoicePajak?.ppn ?? 0;
  const totalBayar = invoicePajak?.total_bayar ?? 0;
  const ppnRate = invoicePajak?.ppn_rate ?? 11;

  if (!invoicePajak) {
    return (
      <Card>
        <Empty title="Belum ada Invoice Pajak" sub="Buat invoice pajak untuk booking ini." action={<Button variant="primary" icon={<IconPlus size={12} />} onClick={onCreate}>Buat Invoice Pajak</Button>} />
      </Card>
    );
  }

  return (
    <Card pad={false}>
      <div className="bd-invoice-bar">
        <div className="bd-invoice-bar__total">
          <span>Invoice Pajak</span>
          <b>{fmtRp(tvp)}</b>
          <span className="muted" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 12.5 }}>· {items.length} item · PPN {ppnRate}%</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button variant="default" size="sm" onClick={() => { exportInvoicePajak(booking, invoicePajak); api.post('/audit/download', { documentType: 'invoice_pajak', bookingId: booking?.id }).catch(() => {}); }}>Download PDF</Button>
          <Button variant="danger" size="sm" icon={<IconTrash size={12} />} onClick={onDelete}>Hapus</Button>
          <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setPajakItemModal({})}>Tambah Item</Button>
        </div>
      </div>

      <div className="tbl-wrap"><table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 50 }}>No.</th>
            <th>Keterangan</th>
            <th style={{ width: 150 }}>Harga</th>
            <th style={{ width: 70 }} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}>
              <td className="num muted">{String(i + 1).padStart(2, "0")}</td>
              <td className="strong">{item.keterangan}</td>
              <RpCell value={item.harga} />
              <td>
                <div className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                  <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => setPajakItemModal({ id: item.id, keterangan: item.keterangan, harga: item.harga })} />
                  <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => deleteItemMutation.mutate(item.id)} />
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4}><Empty title="Belum ada item" sub="Tambahkan item biaya untuk invoice pajak." /></td></tr>}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr><td colSpan={2} className="right" style={{ paddingRight: 24, color: "var(--fg-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Nilai Penyerahan</td><RpCell value={tvp} strong /><td /></tr>
            <tr><td colSpan={2} className="right" style={{ paddingRight: 24, color: "var(--fg-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Dasar Pengenaan Pajak</td><RpCell value={tvp} /><td /></tr>
            <tr><td colSpan={2} className="right" style={{ paddingRight: 24, color: "var(--fg-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>PPN ({ppnRate}%)</td><RpCell value={ppn} /><td /></tr>
            <tr><td colSpan={2} className="right" style={{ paddingRight: 24, fontSize: 13, fontWeight: 600 }}>Total yang harus dibayar</td><RpCell value={totalBayar} strong style={{ fontSize: 16, color: "var(--fg)" }} /><td /></tr>
          </tfoot>
        )}
      </table></div>

    </Card>
  );
}

function ReimbursementTabPanel({ booking, notaReimbursement, invoiceTotal, pajakTotal, onCreate, onDelete, setReimbItemModal, deleteItemMutation }) {
  const items = notaReimbursement?.items ?? [];
  const total = notaReimbursement?.total ?? 0;

  if (!notaReimbursement) {
    return (
      <Card>
        <Empty title="Belum ada Nota Reimbursement" sub="Buat nota reimbursement untuk booking ini." action={<Button variant="primary" icon={<IconPlus size={12} />} onClick={onCreate}>Buat Nota Reimbursement</Button>} />
      </Card>
    );
  }

  return (
    <Card pad={false}>
      <div className="bd-invoice-bar">
        <div className="bd-invoice-bar__total">
          <span>Nota Reimbursement</span>
          <b>{fmtRp(total)}</b>
          <span className="muted" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, fontSize: 12.5 }}>· {items.length} item</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Button variant="default" size="sm" onClick={() => { exportNotaReimbursement(booking, notaReimbursement); api.post('/audit/download', { documentType: 'nota_reimbursement', bookingId: booking?.id }).catch(() => {}); }}>Download PDF</Button>
          <Button variant="danger" size="sm" icon={<IconTrash size={12} />} onClick={onDelete}>Hapus</Button>
          <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setReimbItemModal({})}>Tambah Item</Button>
        </div>
      </div>

      <div className="tbl-wrap"><table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 50 }}>No.</th>
            <th>Description</th>
            <th style={{ width: 70 }}>Qty</th>
            <th style={{ width: 130 }}>Price</th>
            <th style={{ width: 130 }}>Amount</th>
            <th style={{ width: 70 }} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}>
              <td className="num muted">{String(i + 1).padStart(2, "0")}</td>
              <td className="strong">{item.description}</td>
              <td className="right num">{item.qty}</td>
              <RpCell value={item.price} />
              <RpCell value={item.amount} strong />
              <td>
                <div className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                  <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => setReimbItemModal({ id: item.id, description: item.description, qty: item.qty, price: item.price })} />
                  <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => deleteItemMutation.mutate(item.id)} />
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={6}><Empty title="Belum ada item" sub="Tambahkan item reimbursement." /></td></tr>}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: "right", paddingRight: 24, color: "var(--fg-3)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11 }}>Total</td>
              <RpCell value={total} strong style={{ fontSize: 16, color: "var(--fg)" }} />
              <td />
            </tr>
          </tfoot>
        )}
      </table></div>

    </Card>
  );
}

// ── Worker view ──────────────────────────────────────────────────────────────
function WorkerView({ booking, containers, bookingPublicId }) {
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="grid grid-2">
        <IdentitasCard booking={booking} bookingPublicId={bookingPublicId} />
        <PelayaranCard booking={booking} bookingPublicId={bookingPublicId} />
      </div>
      <JadwalTruckingTable bookingPublicId={bookingPublicId} initialContainers={containers} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isFinance, isWorker } = useAuth();
  const toast = useToast();

  // Modal state
  const [payModal, setPayModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);
  const [piutangModal, setPiutangModal] = useState(false);
  const [hutangModal, setHutangModal] = useState(false);
  const [hutangTypeModal, setHutangTypeModal] = useState(false);
  const [truckingPayModal, setTruckingPayModal] = useState(null);
  const [editTruckingPay, setEditTruckingPay] = useState(null);
  const [bulkTruckingModal, setBulkTruckingModal] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pajakItemModal, setPajakItemModal] = useState(null);
  const [reimbItemModal, setReimbItemModal] = useState(null);

  // Finance tab state — honour ?tab= query param
  const VALID_TABS = ["shipment", "dokumen", "invoice", "piutang", "hutang", "pajak"];
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return VALID_TABS.includes(t) ? t : "shipment";
  });

  // Queries
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get(`/bookings/${id}`).then((r) => r.data),
  });

  const { data: dokumen = [] } = useQuery({
    queryKey: ["dokumen", id],
    queryFn: () => api.get(`/bookings/${id}/dokumen`).then((r) => r.data),
    enabled: isFinance,
  });

  const { data: piutang } = useQuery({
    queryKey: ["piutang", id],
    queryFn: () => api.get(`/bookings/${id}/piutang`).then((r) => r.data),
    enabled: isFinance,
  });

  const { data: hutangList = [] } = useQuery({
    queryKey: ["hutang-booking", id],
    queryFn: () => api.get(`/bookings/${id}/hutang`).then((r) => r.data),
    enabled: isFinance,
  });

  const { data: invoicePajak } = useQuery({
    queryKey: ["invoice-pajak", id],
    queryFn: () => api.get(`/bookings/${id}/invoice-pajak`).then((r) => r.data),
    enabled: isFinance,
  });

  const { data: notaReimbursement } = useQuery({
    queryKey: ["nota-reimbursement", id],
    queryFn: () => api.get(`/bookings/${id}/nota-reimbursement`).then((r) => r.data),
    enabled: isFinance,
  });

  // Mutations
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

  const addItemMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${id}/dokumen`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dokumen", id] }); setItemModal(null); toast('Dokumen ditambahkan.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menambah dokumen.'), 'error'),
  });

  const editItemMutation = useMutation({
    mutationFn: ({ itemId, body }) => api.put(`/bookings/${id}/dokumen/${itemId}`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dokumen", id] }); setItemModal(null); toast('Dokumen diperbarui.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal memperbarui dokumen.'), 'error'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => api.delete(`/bookings/${id}/dokumen/${itemId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dokumen", id] }); toast('Dokumen dihapus.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus dokumen.'), 'error'),
  });

  const setPiutangMutation = useMutation({
    mutationFn: (body) => piutang
      ? api.put(`/bookings/${id}/piutang/${piutang.id}`, body).then((r) => r.data)
      : api.post(`/bookings/${id}/piutang`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["piutang", id] }); setPiutangModal(false); toast('Piutang disimpan.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menyimpan piutang.'), 'error'),
  });

  const addPiutangPayMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${id}/piutang/${piutang.id}/pembayaran`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["piutang", id] }); setPayModal(null); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menambah pembayaran.'), 'error'),
  });

  const deletePiutangMutation = useMutation({
    mutationFn: () => api.delete(`/bookings/${id}/piutang/${piutang?.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["piutang", id] }),
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus piutang.'), 'error'),
  });

  const deletePiutangPayMutation = useMutation({
    mutationFn: (payId) => api.delete(`/bookings/${id}/piutang/${piutang.id}/pembayaran/${payId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["piutang", id] }),
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus pembayaran.'), 'error'),
  });

  const editPiutangPayMutation = useMutation({
    mutationFn: ({ payId, body }) => api.put(`/bookings/${id}/piutang/${piutang.id}/pembayaran/${payId}`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["piutang", id] }); setPayModal(null); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal mengubah pembayaran.'), 'error'),
  });

  const addHutangMutation = useMutation({
    mutationFn: (body) => api.post("/hutang", { ...body, booking_id: bookingData?.booking?.id }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }); setHutangModal(false); toast('Hutang ditambahkan.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menambah hutang.'), 'error'),
  });

  const payTruckingHutangMutation = useMutation({
    mutationFn: ({ hutang, noVoucher, pelunasan, tanggal, metode }) =>
      api.post(`/hutang/${hutang.id}/pembayaran`, {
        jumlah: parseInt(pelunasan),
        tanggal,
        metode,
        no_voucher: noVoucher || null,
      }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }); setTruckingPayModal(null); toast('Pembayaran dicatat.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal mencatat pembayaran.'), 'error'),
  });

  const bulkPayTruckingMutation = useMutation({
    mutationFn: ({ payments, tanggal, metode, no_voucher }) =>
      api.post('/hutang/pembayaran/batch', { payments, tanggal, metode, no_voucher }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hutang-booking', id] }); setBulkTruckingModal(null); toast('Pembayaran dicatat.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal mencatat pembayaran.'), 'error'),
  });

  const deleteHutangMutation = useMutation({
    mutationFn: (hutangId) => api.delete(`/hutang/${hutangId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }),
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus hutang.'), 'error'),
  });

  const addHutangPayMutation = useMutation({
    mutationFn: ({ hutangId, body }) => api.post(`/hutang/${hutangId}/pembayaran`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }); setPayModal(null); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menambah pembayaran.'), 'error'),
  });

  const deleteHutangPayMutation = useMutation({
    mutationFn: ({ hutangId, payId }) => api.delete(`/hutang/${hutangId}/pembayaran/${payId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }),
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus pembayaran.'), 'error'),
  });

  const editHutangPayMutation = useMutation({
    mutationFn: ({ hutangId, payId, body }) => api.put(`/hutang/${hutangId}/pembayaran/${payId}`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }); setPayModal(null); setEditTruckingPay(null); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal mengubah pembayaran.'), 'error'),
  });

  const createInvoicePajakMutation = useMutation({
    mutationFn: () => api.post(`/bookings/${id}/invoice-pajak`, {}).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoice-pajak", id] }); toast('Invoice pajak dibuat.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal membuat invoice pajak.'), 'error'),
  });

  const deleteInvoicePajakMutation = useMutation({
    mutationFn: () => api.delete(`/bookings/${id}/invoice-pajak/${invoicePajak?.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoice-pajak", id] }); toast('Invoice pajak dihapus.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus invoice pajak.'), 'error'),
  });

  const addPajakItemMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${id}/invoice-pajak/${invoicePajak?.id}/items`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoice-pajak", id] }); setPajakItemModal(null); toast('Item ditambahkan.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menambah item.'), 'error'),
  });

  const editPajakItemMutation = useMutation({
    mutationFn: ({ itemId, body }) => api.put(`/bookings/${id}/invoice-pajak/${invoicePajak?.id}/items/${itemId}`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoice-pajak", id] }); setPajakItemModal(null); toast('Item diperbarui.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal memperbarui item.'), 'error'),
  });

  const deletePajakItemMutation = useMutation({
    mutationFn: (itemId) => api.delete(`/bookings/${id}/invoice-pajak/${invoicePajak?.id}/items/${itemId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoice-pajak", id] }); toast('Item dihapus.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus item.'), 'error'),
  });

  const createNotaMutation = useMutation({
    mutationFn: () => api.post(`/bookings/${id}/nota-reimbursement`, {}).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nota-reimbursement", id] }); toast('Nota reimbursement dibuat.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal membuat nota reimbursement.'), 'error'),
  });

  const deleteNotaMutation = useMutation({
    mutationFn: () => api.delete(`/bookings/${id}/nota-reimbursement/${notaReimbursement?.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nota-reimbursement", id] }); toast('Nota reimbursement dihapus.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus nota.'), 'error'),
  });

  const addReimbItemMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${id}/nota-reimbursement/${notaReimbursement?.id}/items`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nota-reimbursement", id] }); setReimbItemModal(null); toast('Item ditambahkan.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menambah item.'), 'error'),
  });

  const editReimbItemMutation = useMutation({
    mutationFn: ({ itemId, body }) => api.put(`/bookings/${id}/nota-reimbursement/${notaReimbursement?.id}/items/${itemId}`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nota-reimbursement", id] }); setReimbItemModal(null); toast('Item diperbarui.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal memperbarui item.'), 'error'),
  });

  const deleteReimbItemMutation = useMutation({
    mutationFn: (itemId) => api.delete(`/bookings/${id}/nota-reimbursement/${notaReimbursement?.id}/items/${itemId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nota-reimbursement", id] }); toast('Item dihapus.'); },
    onError: (e) => toast(apiErrMsg(e, 'Gagal menghapus item.'), 'error'),
  });

  if (isLoading) return <BookingDetailSkeleton />;
  if (!bookingData) return <div className="empty"><div className="empty__title" style={{ color: "var(--danger)" }}>Booking tidak ditemukan.</div></div>;

  const { booking, containers } = bookingData;
  const invoiceTotal = dokumen.reduce((s, d) => s + (d.biaya || 0), 0);
  const piutangPaid = piutang?.total_paid ?? 0;
  const piutangSisa = piutang ? Math.max(0, piutang.jumlah - piutangPaid) : 0;
  const piutangSt = piutang?.status ?? "none";

  const bukuState = location.state ?? {};
  const bukuPeriodeLabel = (() => {
    const p = bukuState.buku_periode;
    if (!p) return null;
    const [y, m] = p.split("/");
    return `${monthLabel(parseInt(m))} ${y}`;
  })();
  const crumbs = [
    { label: "Buku Bulanan", onClick: () => navigate("/") },
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
                      {isFinance && (
                        <button className="action-menu__item" onClick={() => { setShowMenu(false); exportBookingInvoice(booking, containers, dokumen, piutang); api.post('/audit/download', { documentType: 'booking_invoice', bookingId: booking?.id }).catch(() => {}); }}>
                          <IcDown size={13} /> Export Booking PDF
                        </button>
                      )}
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

      {(isFinance || isWorker) ? (
        <>
          {isFinance && <div className="bd-money-hero" style={{ marginBottom: 18 }}>
            <div>
              <div className="bd-money-hero__lbl">Total Invoice</div>
              <div className="bd-money-hero__val">{fmtRp(invoiceTotal)}</div>
              <div className="bd-money-hero__sub">{dokumen.length} line items</div>
            </div>
            <div>
              <div className="bd-money-hero__lbl">Piutang</div>
              <div className="bd-money-hero__val">{fmtRp(piutang?.jumlah ?? 0)}</div>
              <div className="bd-money-hero__sub">{piutang?.pembayaran?.length ?? 0} pembayaran</div>
            </div>
            <div>
              <div className="bd-money-hero__lbl">Dibayar</div>
              <div className="bd-money-hero__val ok">{fmtRp(piutangPaid)}</div>
              <div className="bd-money-hero__sub">{piutang?.pembayaran?.length ?? 0} pembayaran</div>
            </div>
            <div>
              <div className="bd-money-hero__lbl">Sisa Piutang</div>
              <div className={`bd-money-hero__val ${piutangSisa > 0 ? "warn" : "ok"}`}>{fmtRp(piutangSisa)}</div>
              <div className="bd-money-hero__sub">{piutangSisa <= 0 ? "Sudah lunas" : "Belum tertagih"}</div>
            </div>
          </div>}

          {/* Tabs */}
          <div className="bd-tabs" role="tablist">
            <button role="tab" className={`bd-tab ${tab === "shipment" ? "is-active" : ""}`} onClick={() => setTab("shipment")}>
              <IcBox size={13} /> Shipment
            </button>
            <button role="tab" className={`bd-tab ${tab === "dokumen" ? "is-active" : ""}`} onClick={() => setTab("dokumen")}>
              <IcList size={13} /> Dokumen
            </button>
            {!isWorker && <button role="tab" className={`bd-tab ${tab === "invoice" ? "is-active" : ""}`} onClick={() => setTab("invoice")}>
              <IcList size={13} /> Invoice
              <span className="bd-tab__count">{dokumen.length}</span>
            </button>}
            {!isWorker && <button role="tab" className={`bd-tab ${tab === "piutang" ? "is-active" : ""}`} onClick={() => setTab("piutang")}>
              <IcDown size={13} style={{ transform: "rotate(180deg)" }} /> Piutang
            </button>}
            {!isWorker && <button role="tab" className={`bd-tab ${tab === "hutang" ? "is-active" : ""}`} onClick={() => setTab("hutang")}>
              <IcUp size={13} style={{ transform: "rotate(180deg)" }} /> Hutang
              <span className="bd-tab__count">{hutangList.length}</span>
            </button>}
            {!isWorker && <button role="tab" className={`bd-tab ${tab === "pajak" ? "is-active" : ""}`} onClick={() => setTab("pajak")}>
              <IcList size={13} /> Pajak &amp; Reimb.
            </button>}
          </div>

          {tab === "shipment" && <ShipmentTabPanel booking={booking} containers={containers} bookingPublicId={id} />}
          {tab === "dokumen"  && <BookingDocuments bookingId={id} canEdit={true} isFinance={isFinance} />}
          {tab === "invoice"  && <InvoiceTabPanel  dokumen={dokumen} invoiceTotal={invoiceTotal} setItemModal={setItemModal} deleteItemMutation={deleteItemMutation} onExportInvoice={() => { exportInvoiceOnly(booking, dokumen); api.post('/audit/download', { documentType: 'invoice', bookingId: booking?.id }).catch(() => {}); }} />}
          {tab === "piutang"  && <PiutangTabPanel  piutang={piutang} piutangPaid={piutangPaid} piutangSisa={piutangSisa} piutangSt={piutangSt} invoiceTotal={invoiceTotal} setPiutangMutation={setPiutangMutation} setPiutangModal={setPiutangModal} setPayModal={setPayModal} deletePiutangPayMutation={deletePiutangPayMutation} deletePiutangMutation={deletePiutangMutation} />}
          {tab === "hutang"   && <HutangTabPanel   hutangList={hutangList} setHutangTypeModal={setHutangTypeModal} setPayModal={setPayModal} setTruckingPayModal={setTruckingPayModal} deleteHutangMutation={deleteHutangMutation} deleteHutangPayMutation={deleteHutangPayMutation} setEditTruckingPay={setEditTruckingPay} setBulkTruckingModal={setBulkTruckingModal} />}
          {tab === "pajak"   && (
            <div className="col" style={{ gap: 16 }}>
              <InvoicePajakTabPanel booking={booking} invoicePajak={invoicePajak} invoiceTotal={invoiceTotal} reimbTotal={notaReimbursement?.total ?? 0} onCreate={() => createInvoicePajakMutation.mutate()} onDelete={() => deleteInvoicePajakMutation.mutate()} setPajakItemModal={setPajakItemModal} deleteItemMutation={deletePajakItemMutation} />
              <ReimbursementTabPanel booking={booking} notaReimbursement={notaReimbursement} invoiceTotal={invoiceTotal} pajakTotal={invoicePajak?.total_nilai_penyerahan ?? 0} onCreate={() => createNotaMutation.mutate()} onDelete={() => deleteNotaMutation.mutate()} setReimbItemModal={setReimbItemModal} deleteItemMutation={deleteReimbItemMutation} />
              <ReconciliationBanner invoiceTotal={invoiceTotal} pajakTotal={invoicePajak?.total_nilai_penyerahan ?? 0} reimbTotal={notaReimbursement?.total ?? 0} />
            </div>
          )}
        </>
      ) : (
        <WorkerView booking={booking} containers={containers} bookingPublicId={id} />
      )}

      {/* Modals */}
      <LineItemModal
        open={!!itemModal} onClose={() => setItemModal(null)} item={itemModal}
        isPending={addItemMutation.isPending || editItemMutation.isPending}
        onSave={(data) => {
          if (itemModal?.id) editItemMutation.mutate({ itemId: itemModal.id, body: data });
          else addItemMutation.mutate(data);
        }}
      />

      <PiutangSetModal
        open={piutangModal} onClose={() => setPiutangModal(false)}
        currentAmount={piutang?.jumlah ?? 0} invoiceTotal={invoiceTotal}
        isPending={setPiutangMutation.isPending}
        onSave={(data) => setPiutangMutation.mutate(data)}
      />

      <HutangTypeModal
        open={hutangTypeModal} onClose={() => setHutangTypeModal(false)}
        onSelectVendor={() => setHutangModal(true)}
      />

      <HutangFormModal
        open={hutangModal} onClose={() => setHutangModal(false)}
        isPending={addHutangMutation.isPending}
        onSave={(data) => addHutangMutation.mutate(data)}
      />

      <TruckingPaymentModal
        open={!!truckingPayModal} onClose={() => setTruckingPayModal(null)}
        hutang={truckingPayModal}
        isPending={payTruckingHutangMutation.isPending}
        onSave={(data) => payTruckingHutangMutation.mutate({ hutang: truckingPayModal, ...data })}
      />

      <BulkTruckingPayModal
        key={bulkTruckingModal ? bulkTruckingModal.map(h => h.id).join(',') : 'bulk-closed'}
        open={!!bulkTruckingModal} onClose={() => setBulkTruckingModal(null)}
        hutangList={bulkTruckingModal ?? []}
        isPending={bulkPayTruckingMutation.isPending}
        onSave={({ noVoucher, tanggal, metode }) => bulkPayTruckingMutation.mutate({
          payments: (bulkTruckingModal ?? []).map(h => ({ hutang_id: h.id, jumlah: h.sisa })),
          tanggal, metode, no_voucher: noVoucher || null,
        })}
      />

      <TruckingPaymentModal
        open={!!editTruckingPay} onClose={() => setEditTruckingPay(null)}
        hutang={editTruckingPay?.hutang}
        editPay={editTruckingPay?.pay}
        isPending={editHutangPayMutation.isPending}
        onSave={({ noVoucher, pelunasan, tanggal, metode }) =>
          editHutangPayMutation.mutate({
            hutangId: editTruckingPay.hutang.id,
            payId: editTruckingPay.pay.id,
            body: { jumlah: parseInt(pelunasan), tanggal, metode, no_voucher: noVoucher || null },
          })
        }
      />

      <InvoicePajakItemModal
        key={pajakItemModal ? JSON.stringify(pajakItemModal) : "pajak-closed"}
        open={!!pajakItemModal} onClose={() => setPajakItemModal(null)} item={pajakItemModal}
        isPending={addPajakItemMutation.isPending || editPajakItemMutation.isPending}
        onSave={(data) => {
          if (pajakItemModal?.id) editPajakItemMutation.mutate({ itemId: pajakItemModal.id, body: data });
          else addPajakItemMutation.mutate(data);
        }}
      />

      <ReimbursementItemModal
        key={reimbItemModal ? JSON.stringify(reimbItemModal) : "reimb-closed"}
        open={!!reimbItemModal} onClose={() => setReimbItemModal(null)} item={reimbItemModal}
        isPending={addReimbItemMutation.isPending || editReimbItemMutation.isPending}
        onSave={(data) => {
          if (reimbItemModal?.id) editReimbItemMutation.mutate({ itemId: reimbItemModal.id, body: data });
          else addReimbItemMutation.mutate(data);
        }}
      />

      <PaymentModal
        open={!!payModal} onClose={() => setPayModal(null)}
        label={payModal?.label} initialData={payModal?.initialData}
        isPending={addPiutangPayMutation.isPending || addHutangPayMutation.isPending || editPiutangPayMutation.isPending || editHutangPayMutation.isPending}
        onSave={(pay) => {
          if (payModal?.editPayId) {
            if (payModal.kind === "piutang") editPiutangPayMutation.mutate({ payId: payModal.editPayId, body: pay });
            else editHutangPayMutation.mutate({ hutangId: payModal.hutangId, payId: payModal.editPayId, body: pay });
          } else {
            if (payModal?.kind === "piutang") addPiutangPayMutation.mutate(pay);
            else addHutangPayMutation.mutate({ hutangId: payModal.hutangId, body: pay });
          }
        }}
      />
    </>
  );
}
