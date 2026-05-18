import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBukuList } from "../api/buku.js";
import api from "../api/client.js";
import { fmtRp, Badge, Button, Input, Select, PageHeader, Card, Empty, Stat, Progress, RpCell } from "../components/ui.jsx";
import { IconSearch } from "../components/Icons.jsx";

export default function Piutang() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [bukuId, setBukuId] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["piutang-list", { q, page }],
    queryFn: () => api.get("/piutang", { params: { q, page, limit: 20 } }).then((r) => r.data),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const { data: bukuList = [] } = useQuery({
    queryKey: ["buku"],
    queryFn: getBukuList,
  });

  const allRows = data?.rows ?? [];
  const rows = allRows
    .filter((r) => !status || r.status === status)
    .filter((r) => !bukuId || String(r.buku_id) === bukuId);
  const total = data?.total ?? 0;

  const totalTagihan = allRows.reduce((a, r) => a + (r.jumlah ?? 0), 0);
  const totalSisa = allRows.reduce((a, r) => a + (r.sisa ?? 0), 0);
  const belumCount = allRows.filter((r) => r.status === "belum_bayar").length;
  const sebagianCount = allRows.filter((r) => r.status === "sebagian").length;

  return (
    <>
      <PageHeader title="Piutang" meta={`${total} tagihan`} />

      <div className="grid grid-stats mb-12">
        <Card pad={false}><Stat label="Total Tagihan" value={fmtRp(totalTagihan)} sub={`${allRows.length} entri`} /></Card>
        <Card pad={false}><Stat label="Total Sisa" value={fmtRp(totalSisa)} tone={totalSisa > 0 ? "warn" : "ok"} sub="Belum tertagih" /></Card>
        <Card pad={false}><Stat label="Belum Bayar" value={belumCount} tone="danger" sub="Tagihan outstanding" /></Card>
        <Card pad={false}><Stat label="Sebagian" value={sebagianCount} tone="warn" sub="Bayar sebagian" /></Card>
      </div>

      <div className="row-wrap mb-16" style={{ gap: 8 }}>
        <div className="search" style={{ flex: 1, minWidth: 240 }}>
          <IconSearch size={14} />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cari job no / shipper…" />
        </div>
        <Select value={bukuId} onChange={(e) => { setBukuId(e.target.value); setPage(1); }} style={{ width: 160 }}>
          <option value="">Semua Buku</option>
          {bukuList.map((b) => (
            <option key={b.id} value={b.id}>
              {String(b.bulan).padStart(2, "0")}/{b.tahun}
            </option>
          ))}
        </Select>
        <div className="seg">
          {[["", "Semua"], ["belum_bayar", "Belum"], ["sebagian", "Sebagian"], ["lunas", "Lunas"]].map(([v, l]) => (
            <button key={v} className={status === v ? "is-active" : ""} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      <Card pad={false}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Job No</th><th>Shipper</th><th>Buku</th>
              <th>Tagihan</th><th>Dibayar</th><th>Sisa</th>
              <th style={{ width: 140 }}>Progress</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8}><Empty title="Memuat…" /></td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={8}><Empty title="Belum ada data piutang." /></td></tr>}
            {rows.map((r) => {
              const pct = r.jumlah ? Math.round(((r.total_paid ?? 0) / r.jumlah) * 100) : 0;
              const buku = bukuList.find((b) => b.id === r.buku_id);
              return (
                <tr key={r.id} className="is-clickable" onClick={() => navigate(`/bookings/${r.booking_public_id}`)}>
                  <td className="strong mono">{r.job_no}</td>
                  <td className="strong">{r.shipper}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>
                    {buku ? `${String(buku.bulan).padStart(2, "0")}/${buku.tahun}` : r.buku_id ? `#${r.buku_id}` : "—"}
                  </td>
                  <RpCell value={r.jumlah} />
                  <RpCell value={r.total_paid ?? 0} style={{ color: "var(--ok)" }} />
                  <RpCell value={r.sisa} style={{ color: r.sisa > 0 ? "var(--accent)" : "var(--ok)" }} />
                  <td>
                    <div className="row" style={{ gap: 6, alignItems: "center" }}>
                      <Progress value={r.total_paid ?? 0} max={r.jumlah || 1} tone={pct === 100 ? "ok" : pct > 0 ? "warn" : "danger"} />
                      <span className="muted num" style={{ fontSize: 11, minWidth: 30, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </td>
                  <td><Badge status={r.status} /></td>
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
