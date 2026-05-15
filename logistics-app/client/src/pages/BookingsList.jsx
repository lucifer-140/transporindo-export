import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getBukuList } from "../api/buku.js";
import api from "../api/client.js";
import { fmtRp, fmtDate, Badge, Button, Input, Select, PageHeader, Card, Empty } from "../components/ui.jsx";
import { IconPlus, IconSearch, IconDownload, IconChevron } from "../components/Icons.jsx";

export default function BookingsList() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [bukuFilter, setBukuFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", { q, bukuFilter, page }],
    queryFn: () => api.get("/bookings", { params: { q, buku_id: bukuFilter || undefined, page, limit: LIMIT } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: bukuList = [] } = useQuery({
    queryKey: ["buku"],
    queryFn: getBukuList,
  });

  const allRows = data?.rows ?? [];
  const rows = allRows.filter((r) => !statusFilter || r.piutang_status === statusFilter);
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  function handleExport() {
    window.location.href = `/api/bookings/export`;
  }

  return (
    <>
      <PageHeader
        title="Semua Bookings"
        meta={`${total} shipment`}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <Button variant="default" icon={<IconDownload size={14} />} onClick={handleExport}>Export CSV</Button>
            <Button variant="primary" icon={<IconPlus size={14} />} onClick={() => navigate("/bookings/new")}>Booking Baru</Button>
          </div>
        }
      />

      <div className="row" style={{ gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="search" style={{ flex: 1, minWidth: 240 }}>
          <IconSearch size={14} />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cari Job No, shipper, vessel, PEB, BON…" />
        </div>
        <Select value={bukuFilter} onChange={(e) => { setBukuFilter(e.target.value); setPage(1); }} style={{ width: 160 }}>
          <option value="">Semua Buku</option>
          {bukuList.map((b) => (
            <option key={b.id} value={b.id}>{String(b.bulan).padStart(2, "0")}/{b.tahun}</option>
          ))}
        </Select>
        <div className="seg">
          {[["", "Semua"], ["belum_bayar", "Belum"], ["sebagian", "Sebagian"], ["lunas", "Lunas"]].map(([v, l]) => (
            <button key={v} className={statusFilter === v ? "is-active" : ""} onClick={() => setStatusFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      <Card pad={false}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Job No</th><th>Buku</th><th>Shipper</th><th>Commodity</th><th>Vessel</th>
              <th>Out Date</th><th>Status</th>
              <th className="right">Tagihan</th><th className="right">Sisa</th>
              <th style={{ width: 20 }} />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={10}><Empty title="Memuat…" /></td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={10}><Empty title="Tidak ada booking ditemukan." /></td></tr>}
            {rows.map((row) => {
              const buku = bukuList.find((b) => b.id === row.buku_id);
              return (
                <tr key={row.id} className="is-clickable" onClick={() => navigate(`/bookings/${row.id}`)}>
                  <td className="strong mono">{row.job_no}</td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {buku ? `${String(buku.bulan).padStart(2, "0")}/${buku.tahun}` : row.buku_id ? `#${row.buku_id}` : "—"}
                  </td>
                  <td className="strong">{row.shipper}</td>
                  <td>{row.commodity || "—"}</td>
                  <td>{row.vessel_name || "—"}{row.vessel_no ? <span className="muted"> / {row.vessel_no}</span> : ""}</td>
                  <td className={row.out_date ? "num" : "dim"} style={{ fontSize: 12 }}>
                    {row.out_date ? fmtDate(row.out_date) : "Pending"}
                  </td>
                  <td><Badge status={row.piutang_status === "none" ? "muted" : row.piutang_status} label={row.piutang_status === "none" ? "—" : undefined} /></td>
                  <td className="right num">{fmtRp(row.tagihan ?? 0)}</td>
                  <td className="right num strong">{fmtRp(row.sisa_piutang ?? 0)}</td>
                  <td><IconChevron size={12} style={{ color: "var(--fg-3)" }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="row mt-16" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 13 }}>{total} total</span>
          <div className="row" style={{ gap: 6 }}>
            <Button variant="default" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
            <span className="muted" style={{ padding: "0 8px", fontSize: 13 }}>{page} / {totalPages}</span>
            <Button variant="default" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
          </div>
        </div>
      )}
    </>
  );
}
