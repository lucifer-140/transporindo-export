import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBuku, updateBukuStatus } from "../api/buku.js";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../components/Toast.jsx";
import { Badge, Button, Modal, PageHeader, Empty, Progress, fmtRp, fmtDate, monthLabel } from "../components/ui.jsx";
import { IconPlus, IconChevron, IconDownload } from "../components/Icons.jsx";

const PAGE_SIZE = 20;

export default function BukuDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFinance, isAdmin, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmClose, setConfirmClose] = useState(false);
  const [selectedShipper, setSelectedShipper] = useState(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailPage, setDetailPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["buku", id],
    queryFn: () => getBuku(id),
  });

  const statusMutation = useMutation({
    mutationFn: (action) => updateBukuStatus(id, action),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["buku"] });
      setConfirmClose(false);
      toast(updated.status === "closed" ? "Buku ditutup." : "Buku dibuka kembali.");
    },
    onError: (e) => toast(e.response?.data?.error ?? "Gagal mengubah status buku.", "error"),
  });

  if (isLoading) return <div className="empty"><div className="empty__title">Memuat…</div></div>;
  if (isError || !data?.buku) return <div className="empty"><div className="empty__title" style={{ color: "var(--danger)" }}>Gagal memuat data.</div></div>;

  const { buku, shippers = [], booking_count } = data;
  const periode = `${monthLabel(buku.bulan)} ${buku.tahun}`;
  const bukuState = { buku_id: buku.id, buku_periode: `${buku.tahun}/${String(buku.bulan).padStart(2, "0")}` };

  const activeShipperName = selectedShipper ?? (shippers[0]?.shipper ?? null);
  const activeGroup = shippers.find((g) => g.shipper === activeShipperName) ?? null;
  const activePct = activeGroup && activeGroup.total_tagihan ? Math.round((activeGroup.total_paid / activeGroup.total_tagihan) * 100) : 0;

  const totals = shippers.reduce((acc, g) => ({
    tagihan: acc.tagihan + g.total_tagihan,
    dibayar: acc.dibayar + g.total_paid,
    sisa: acc.sisa + g.sisa,
  }), { tagihan: 0, dibayar: 0, sisa: 0 });

  const query = detailSearch.toLowerCase();
  const filtered = activeGroup
    ? activeGroup.bookings.filter((bk) =>
        query === "" ||
        bk.job_no?.toLowerCase().includes(query) ||
        bk.commodity?.toLowerCase().includes(query) ||
        bk.vessel_name?.toLowerCase().includes(query)
      )
    : [];
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE);

  function selectShipper(name) {
    setSelectedShipper(name);
    setDetailSearch("");
    setDetailPage(0);
  }

  return (
    <>
      {confirmClose && (
        <Modal open onClose={() => setConfirmClose(false)} title="Tutup Buku?"
          footer={
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <Button variant="default" onClick={() => setConfirmClose(false)}>Batal</Button>
              <Button variant="danger" onClick={() => statusMutation.mutate("tutup")} disabled={statusMutation.isPending}>Ya, Tutup</Button>
            </div>
          }>
          <p style={{ margin: 0 }}>Setelah ditutup, tidak ada yang bisa menambah atau mengubah booking dan data keuangan di buku <strong>{periode}</strong>. Admin dapat membuka kembali kapan saja.</p>
        </Modal>
      )}

      <PageHeader
        crumbs={[{ label: "Buku Bulanan", onClick: () => navigate("/") }, { label: periode }]}
        title={periode}
        meta={
          <span className="row" style={{ gap: 10 }}>
            <Badge status={buku.status} dot={false} />
            <span className="dim">•</span>
            <span>{booking_count} bookings · {shippers.length} shipper aktif</span>
          </span>
        }
        actions={
          <div className="row" style={{ gap: 8 }}>
            <Button variant="default" icon={<IconDownload size={14} />} onClick={() => {}}>Export CSV</Button>
            {isAdmin && (
              buku.status === "closed"
                ? <Button variant="default" onClick={() => statusMutation.mutate("buka")} disabled={statusMutation.isPending}>Buka Buku</Button>
                : <Button variant="default" onClick={() => setConfirmClose(true)} disabled={statusMutation.isPending}>Tutup Buku</Button>
            )}
            {user && buku.status !== "closed" && (
              <Button variant="primary" icon={<IconPlus size={14} />}
                onClick={() => navigate("/bookings/new", { state: bukuState })}>
                Booking Baru
              </Button>
            )}
          </div>
        }
      />

      {buku.status === "closed" && (
        <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 20, background: "color-mix(in srgb, var(--warn) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)", color: "var(--warn)", fontSize: 13 }}>
          Buku ini sudah ditutup. Tidak dapat menambah atau mengubah data.{isAdmin && " Klik \"Buka Buku\" untuk membuka kembali."}
        </div>
      )}

      {isFinance && (
        <div className="sum-bar mb-24">
          <div className="stat">
            <div className="stat__lbl">Total Tagihan</div>
            <div className="stat__val">{fmtRp(totals.tagihan)}</div>
            <div className="stat__sub">Untuk {shippers.length} shipper</div>
          </div>
          <div className="stat stat--ok">
            <div className="stat__lbl">Sudah Dibayar</div>
            <div className="stat__val">{fmtRp(totals.dibayar)}</div>
            <div className="stat__sub">{totals.tagihan ? Math.round((totals.dibayar / totals.tagihan) * 100) : 0}% dari tagihan</div>
          </div>
          <div className="stat">
            <div className="stat__lbl">Sisa</div>
            <div className="stat__val" style={{ color: totals.sisa > 0 ? "var(--accent)" : "var(--ok)" }}>{fmtRp(totals.sisa)}</div>
            <div className="stat__sub">
              {shippers.reduce((a, g) => a + g.bookings.filter((b) => b.piutang_status === "belum_bayar").length, 0)} belum ·{" "}
              {shippers.reduce((a, g) => a + g.bookings.filter((b) => b.piutang_status === "sebagian").length, 0)} sebagian
            </div>
          </div>
        </div>
      )}

      <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Rincian per Shipper</h2>

      {shippers.length === 0 ? (
        <div className="card">
          <Empty title="Belum ada booking di buku ini"
            sub="Klik 'Booking Baru' untuk membuat shipment pertama bulan ini."
            action={user ? <Button variant="primary" icon={<IconPlus size={14} />}
              onClick={() => navigate("/bookings/new", { state: bukuState })}>Booking Baru</Button> : null} />
        </div>
      ) : (
        <div className="buku-tabs-card">
          {/* Tab strip — one tab per shipper */}
          <div className="buku-tab-strip">
            {shippers.map((g) => (
              <button
                key={g.shipper}
                className={`buku-tab${g.shipper === activeShipperName ? " is-active" : ""}`}
                onClick={() => selectShipper(g.shipper)}
              >
                {g.shipper}
                <span className="buku-tab__count">{g.bookings.length}</span>
              </button>
            ))}
          </div>

          {/* Finance summary bar for active shipper */}
          {isFinance && activeGroup && (
            <div className="buku-finance-bar">
              <div className="buku-finance-bar__stat">
                <div className="buku-finance-bar__label">Tagihan</div>
                <div className="buku-finance-bar__val">{fmtRp(activeGroup.total_tagihan)}</div>
              </div>
              <div className="buku-finance-bar__stat">
                <div className="buku-finance-bar__label">Dibayar</div>
                <div className="buku-finance-bar__val" style={{ color: "var(--ok)" }}>{fmtRp(activeGroup.total_paid)}</div>
              </div>
              <div className="buku-finance-bar__stat">
                <div className="buku-finance-bar__label">Sisa</div>
                <div className="buku-finance-bar__val" style={{ color: activeGroup.sisa > 0 ? "var(--accent)" : "var(--ok)" }}>{fmtRp(activeGroup.sisa)}</div>
              </div>
              <div className="buku-finance-bar__progress">
                <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{activePct}%</span>
                <Progress value={activeGroup.total_paid} max={activeGroup.total_tagihan || 1} tone={activePct === 100 ? "ok" : activePct > 0 ? "warn" : "danger"} />
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="buku-tab-toolbar">
            <input
              className="inp"
              placeholder="Cari job no / komoditi / kapal…"
              value={detailSearch}
              onChange={(e) => { setDetailSearch(e.target.value); setDetailPage(0); }}
            />
            {query && (
              <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {filtered.length} / {activeGroup?.bookings.length}
              </span>
            )}
          </div>

          {/* Table body */}
          <div className="buku-tab-body">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Commodity</th>
                  <th>Vessel</th>
                  {isFinance ? (
                    <>
                      <th>Status</th>
                      <th className="right">Tagihan</th>
                      <th className="right">Dibayar</th>
                      <th className="right">Sisa</th>
                    </>
                  ) : (
                    <>
                      <th>Status</th>
                      <th>In / Out</th>
                      <th>PEB</th>
                      <th>Trucking</th>
                    </>
                  )}
                  <th style={{ width: 20 }} />
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "32px 0", color: "var(--fg-3)" }}>
                      Tidak ada booking yang cocok.
                    </td>
                  </tr>
                ) : pageData.map((bk) => (
                  <tr key={bk.id} className="is-clickable"
                    onClick={() => navigate(`/bookings/${bk.public_id}`, { state: bukuState })}>
                    <td className="strong mono">{bk.job_no}</td>
                    <td>{bk.commodity || "—"}</td>
                    <td>{bk.vessel_name || "—"}{bk.vessel_no ? <span className="muted"> / {bk.vessel_no}</span> : ""}</td>
                    {isFinance ? (
                      <>
                        <td><Badge status={bk.piutang_status === "none" ? "muted" : bk.piutang_status} label={bk.piutang_status === "none" ? "—" : undefined} /></td>
                        <td className="right num">{fmtRp(bk.tagihan)}</td>
                        <td className="right num" style={{ color: bk.total_paid > 0 ? "var(--ok)" : "var(--fg-3)" }}>{fmtRp(bk.total_paid)}</td>
                        <td className="right num strong">{fmtRp(bk.sisa)}</td>
                      </>
                    ) : (
                      <>
                        <td><Badge status={bk.status} /></td>
                        <td className="num">{fmtDate(bk.in_date)} → {bk.out_date ? fmtDate(bk.out_date) : <span className="dim">pending</span>}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{bk.peb || "—"}</td>
                        <td>{bk.trucking || "—"}</td>
                      </>
                    )}
                    <td><IconChevron size={12} style={{ color: "var(--fg-3)" }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="row" style={{ gap: 8, justifyContent: "center", padding: "14px 16px", alignItems: "center" }}>
                <button className="pill-tab" disabled={detailPage === 0} onClick={() => setDetailPage(detailPage - 1)}>‹ Prev</button>
                <span className="muted" style={{ fontSize: 12 }}>Hal {detailPage + 1} / {totalPages}</span>
                <button className="pill-tab" disabled={detailPage >= totalPages - 1} onClick={() => setDetailPage(detailPage + 1)}>Next ›</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
