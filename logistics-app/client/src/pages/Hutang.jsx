import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBukuList } from "../api/buku.js";
import api from "../api/client.js";
import { fmtRp, Badge, Button, Field, Input, Modal, PageHeader, Card, Empty, Stat, RpCell } from "../components/ui.jsx";
import { IconPlus, IconSearch, IconChevron } from "../components/Icons.jsx";
import { useToast } from "../components/Toast.jsx";

const EMPTY_FORM = { pihak: "", jumlah: "", keterangan: "", booking_id: "" };

export default function Hutang() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["hutang-list", { q, page }],
    queryFn: () => api.get("/hutang", { params: { q, page, limit: 20 } }).then((r) => r.data),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const { data: bukuList = [] } = useQuery({
    queryKey: ["buku"],
    queryFn: getBukuList,
  });

  const allRows = data?.rows ?? [];
  const rows = allRows.filter((r) => !statusFilter || r.status === statusFilter);
  const total = data?.total ?? 0;

  const totalHutang = allRows.reduce((a, r) => a + (r.jumlah ?? 0), 0);
  const totalSisa = allRows.reduce((a, r) => a + (r.sisa ?? 0), 0);
  const belumCount = allRows.filter((r) => r.status === "belum_bayar").length;
  const lunasCount = allRows.filter((r) => r.status === "lunas").length;

  const toast = useToast();

  const createMutation = useMutation({
    mutationFn: (body) => api.post("/hutang", body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hutang-list"] });
      setShowForm(false); setForm({ ...EMPTY_FORM }); setFormError("");
      toast("Hutang berhasil ditambahkan.");
    },
    onError: (e) => setFormError(e.response?.data?.error ?? "Gagal menyimpan."),
  });

  function handleSubmit(e) {
    e.preventDefault();
    createMutation.mutate({
      pihak: form.pihak, jumlah: parseInt(form.jumlah) || 0, keterangan: form.keterangan,
      ...(form.booking_id ? { booking_id: parseInt(form.booking_id) } : {}),
    });
  }

  return (
    <>
      <PageHeader
        title="Hutang"
        meta="Tagihan vendor yang masih harus dibayar perusahaan."
        actions={
          <Button variant="primary" icon={<IconPlus size={14} />} onClick={() => { setShowForm(true); setFormError(""); }}>
            Tambah Hutang
          </Button>
        }
      />

      <div className="grid grid-stats mb-12">
        <Card pad={false}><Stat label="Total Hutang" value={fmtRp(totalHutang)} sub={`${allRows.length} item`} /></Card>
        <Card pad={false}><Stat label="Sisa Hutang" value={fmtRp(totalSisa)} tone="danger" sub="Belum dilunasi" /></Card>
        <Card pad={false}><Stat label="Belum Bayar" value={belumCount} tone="danger" /></Card>
        <Card pad={false}><Stat label="Lunas" value={lunasCount} tone="ok" /></Card>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Tambah Hutang Vendor"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={createMutation.isPending}>Simpan</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-form-2">
            <Field label="Pihak (Vendor)" required span={2}>
              <Input required value={form.pihak} onChange={(e) => setForm((f) => ({ ...f, pihak: e.target.value }))} />
            </Field>
            <Field label="Jumlah (Rp)" required>
              <Input type="number" min="0" required value={form.jumlah} onChange={(e) => setForm((f) => ({ ...f, jumlah: e.target.value }))} />
            </Field>
            <Field label="Keterangan">
              <Input value={form.keterangan} onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))} />
            </Field>
            <Field label="Booking ID" hint="Opsional">
              <Input type="number" value={form.booking_id} onChange={(e) => setForm((f) => ({ ...f, booking_id: e.target.value }))}
                placeholder="Kosongkan jika standalone" />
            </Field>
          </div>
          {formError && <div className="auth__err mt-8">{formError}</div>}
        </form>
      </Modal>

      <div className="row" style={{ marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <div className="search" style={{ flex: 1, minWidth: 240 }}>
          <IconSearch size={14} />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari pihak / keterangan…" />
        </div>
        <div className="seg">
          {[["", "Semua"], ["belum_bayar", "Belum Bayar"], ["sebagian", "Sebagian"], ["lunas", "Lunas"]].map(([v, l]) => (
            <button key={v} className={statusFilter === v ? "is-active" : ""} onClick={() => setStatusFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      <Card pad={false}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Vendor</th><th>Job No</th><th>Shipper</th><th>Buku</th><th>Keterangan</th>
              <th>Status</th><th>Jumlah</th><th>Sisa</th>
              <th style={{ width: 20 }} />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9}><Empty title="Memuat…" /></td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={9}><Empty title="Belum ada data hutang." /></td></tr>}
            {rows.map((h) => {
              const buku = bukuList.find((b) => b.id === h.buku_id);
              return (
                <tr key={h.id} className="is-clickable"
                  onClick={() => h.booking_id ? navigate(`/bookings/${h.booking_public_id}`) : undefined}>
                  <td className="strong">{h.pihak}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{h.job_no || "—"}</td>
                  <td>{h.shipper || <span className="dim">—</span>}</td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {buku ? `${String(buku.bulan).padStart(2, "0")}/${buku.tahun}` : h.buku_id ? `#${h.buku_id}` : "—"}
                  </td>
                  <td className="muted" style={{ fontSize: 13 }}>{h.keterangan || "—"}</td>
                  <td><Badge status={h.status} /></td>
                  <RpCell value={h.jumlah} />
                  <RpCell value={h.sisa} strong />
                  <td><IconChevron size={12} style={{ color: "var(--fg-3)" }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {total > 20 && (
        <div className="row mt-16" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 13 }}>{total} total</span>
          <div className="row" style={{ gap: 6 }}>
            <Button variant="default" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</Button>
            <span className="muted" style={{ padding: "0 8px", fontSize: 13 }}>Hal. {page}</span>
            <Button variant="default" size="sm" disabled={rows.length < 20} onClick={() => setPage((p) => p + 1)}>Next →</Button>
          </div>
        </div>
      )}
    </>
  );
}
