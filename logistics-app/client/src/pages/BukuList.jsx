import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBukuList, createBuku, deleteBuku } from "../api/buku.js";
import { useAuth } from "../hooks/useAuth.js";
import { Badge, Button, Field, Input, Select, Modal, PageHeader, Empty, Card, Stat, Progress, fmtRp, monthLabel } from "../components/ui.jsx";
import { IconPlus, IconTrash, IconChevron } from "../components/Icons.jsx";

export default function BukuList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isFinance } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tahun: new Date().getFullYear(), bulan: new Date().getMonth() + 1 });
  const [formError, setFormError] = useState("");

  const { data: bukuList = [], isLoading } = useQuery({
    queryKey: ["buku"],
    queryFn: getBukuList,
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: createBuku,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buku"] });
      setShowForm(false);
      setFormError("");
    },
    onError: (e) => setFormError(e.response?.data?.error ?? "Gagal membuat buku"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBuku,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["buku"] }),
    onError: (e) => alert(e.response?.data?.error ?? "Gagal hapus buku"),
  });

  function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    createMutation.mutate({ tahun: parseInt(form.tahun), bulan: parseInt(form.bulan) });
  }

  const totalTagihan = bukuList.reduce((a, b) => a + (b.tagihan ?? 0), 0);
  const totalDibayar = bukuList.reduce((a, b) => a + (b.dibayar ?? 0), 0);
  const totalSisa = totalTagihan - totalDibayar;
  const totalBookings = bukuList.reduce((a, b) => a + (b.booking_count ?? 0), 0);
  const bukuAktif = bukuList.filter((b) => b.status === "open").length;

  return (
    <>
      <PageHeader
        title="Buku Bulanan"
        meta={isFinance
          ? "Periode pencatatan ekspor — pilih bulan untuk ringkasan tagihan & pembayaran."
          : "Periode pencatatan ekspor — pilih bulan untuk melihat daftar booking."}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <span className="refresh-pill"><span className="dot dot--ok" /> Auto-refresh 15s</span>
            <Button variant="primary" icon={<IconPlus size={14} />} onClick={() => { setShowForm(true); setFormError(""); }}>
              Buku Baru
            </Button>
          </div>
        }
      />

      {isFinance ? (
        <div className="grid grid-stats mb-12">
          <Card pad={false}><Stat label="Total Tagihan" value={fmtRp(totalTagihan)} sub={`${totalBookings} bookings`} /></Card>
          <Card pad={false}><Stat label="Sudah Dibayar" value={fmtRp(totalDibayar)} tone="ok" sub={totalTagihan ? `${Math.round((totalDibayar / totalTagihan) * 100)}% dari total` : "—"} /></Card>
          <Card pad={false}><Stat label="Sisa Piutang" value={fmtRp(totalSisa)} tone={totalSisa > 0 ? "warn" : "ok"} sub="Belum tertagih" /></Card>
          <Card pad={false}><Stat label="Total Buku" value={bukuList.length} sub={`${bukuAktif} aktif`} /></Card>
        </div>
      ) : (
        <div className="grid grid-stats mb-12">
          <Card pad={false}><Stat label="Total Bookings" value={totalBookings} sub={`Tersebar di ${bukuList.length} buku`} /></Card>
          <Card pad={false}><Stat label="Buku Aktif" value={bukuAktif} sub="Status Open" /></Card>
          <Card pad={false}><Stat label="Total Buku" value={bukuList.length} sub="Semua periode" /></Card>
          <Card pad={false}><Stat label="Bulan Ini" value={bukuList[0]?.booking_count ?? 0} sub={bukuList[0] ? `${monthLabel(bukuList[0].bulan)} ${bukuList[0].tahun}` : "—"} /></Card>
        </div>
      )}

      <Modal
        open={showForm} onClose={() => setShowForm(false)} title="Buat Buku Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button variant="primary" disabled={createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending ? "Menyimpan…" : "Buat Buku"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="grid grid-form-2">
            <Field label="Tahun" required>
              <Input type="number" min="2020" max="2099" value={form.tahun}
                onChange={(e) => setForm((f) => ({ ...f, tahun: e.target.value }))} />
            </Field>
            <Field label="Bulan" required>
              <Select value={form.bulan} onChange={(e) => setForm((f) => ({ ...f, bulan: e.target.value }))}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, "0")} — {monthLabel(i + 1)}</option>
                ))}
              </Select>
            </Field>
          </div>
          {formError && <div className="auth__err mt-8">{formError}</div>}
        </form>
      </Modal>

      {isLoading ? (
        <div className="empty"><div className="empty__title">Memuat…</div></div>
      ) : bukuList.length === 0 ? (
        <Empty title="Belum ada buku" sub="Buat buku baru untuk mulai mencatat booking." />
      ) : (
        <Card title="Semua Periode" action={<span className="muted" style={{ fontSize: 12 }}>{bukuList.length} periode</span>} pad={false}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Status</th>
                <th>Bookings</th>
                {isFinance && <>
                  <th className="right">Tagihan</th>
                  <th className="right">Dibayar</th>
                  <th className="right">Sisa</th>
                  <th style={{ width: 140 }}>Progress</th>
                </>}
                <th style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {bukuList.map((b) => {
                const pct = b.tagihan ? Math.round(((b.dibayar ?? 0) / b.tagihan) * 100) : 0;
                return (
                  <tr key={b.id} className="is-clickable" onClick={() => navigate(`/buku/${b.id}`)}>
                    <td>
                      <div className="row" style={{ gap: 10, alignItems: "center" }}>
                        <span style={{
                          width: 36, height: 36, borderRadius: 8, display: "grid", placeItems: "center",
                          background: "var(--surface-2)", fontFamily: "Geist Mono, monospace",
                          fontSize: 11, fontWeight: 600, border: "1px solid var(--border)", flexShrink: 0,
                        }}>
                          {String(b.bulan).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="strong">{monthLabel(b.bulan)} {b.tahun}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {new Date(b.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><Badge status={b.status} /></td>
                    <td className="num">{b.booking_count}</td>
                    {isFinance && <>
                      <td className="right num">{fmtRp(b.tagihan ?? 0)}</td>
                      <td className="right num" style={{ color: "var(--ok)" }}>{fmtRp(b.dibayar ?? 0)}</td>
                      <td className="right num strong">{fmtRp(b.sisa ?? 0)}</td>
                      <td>
                        <div className="row" style={{ gap: 8, alignItems: "center" }}>
                          <Progress value={b.dibayar ?? 0} max={b.tagihan || 1} tone={pct === 100 ? "ok" : pct > 0 ? "warn" : "danger"} />
                          <span className="muted num" style={{ fontSize: 11, minWidth: 30, textAlign: "right" }}>{pct}%</span>
                        </div>
                      </td>
                    </>}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                        {b.booking_count === 0 ? (
                          <Button variant="ghost" size="sm" icon={<IconTrash size={12} />}
                            onClick={() => { if (confirm(`Hapus buku ${b.tahun}/${String(b.bulan).padStart(2, "0")}?`)) deleteMutation.mutate(b.id); }} />
                        ) : (
                          <IconChevron size={14} style={{ color: "var(--fg-3)" }} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
