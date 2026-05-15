import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBuku } from "../api/buku.js";
import { useAuth } from "../hooks/useAuth.js";
import { Badge, Button, PageHeader, Empty, Progress, Stat, Card, fmtRp, fmtDate, monthLabel } from "../components/ui.jsx";
import { IconPlus, IconChevron, IconDownload } from "../components/Icons.jsx";

export default function BukuDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFinance, user } = useAuth();
  const [openIds, setOpenIds] = useState(null); // null = default (first open)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["buku", id],
    queryFn: () => getBuku(id),
  });

  if (isLoading) return <div className="empty"><div className="empty__title">Memuat…</div></div>;
  if (isError || !data?.buku) return <div className="empty"><div className="empty__title" style={{ color: "var(--danger)" }}>Gagal memuat data.</div></div>;

  const { buku, shippers = [], booking_count } = data;
  const periode = `${monthLabel(buku.bulan)} ${buku.tahun}`;

  const getOpen = () => openIds ?? new Set(shippers.length > 0 ? [shippers[0].shipper] : []);
  const toggle = (name) => {
    const s = getOpen();
    const n = new Set(s);
    n.has(name) ? n.delete(name) : n.add(name);
    setOpenIds(n);
  };

  const totals = shippers.reduce((acc, g) => ({
    tagihan: acc.tagihan + g.total_tagihan,
    dibayar: acc.dibayar + g.total_paid,
    sisa: acc.sisa + g.sisa,
  }), { tagihan: 0, dibayar: 0, sisa: 0 });

  return (
    <>
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
            {user && (
              <Button variant="primary" icon={<IconPlus size={14} />}
                onClick={() => navigate("/bookings/new", { state: { buku_id: buku.id, buku_periode: `${buku.tahun}/${String(buku.bulan).padStart(2, "0")}` } })}>
                Booking Baru
              </Button>
            )}
          </div>
        }
      />

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

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Rincian per Shipper</h2>
        <div className="row" style={{ gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={() => setOpenIds(new Set(shippers.map((g) => g.shipper)))}>Buka semua</Button>
          <Button variant="ghost" size="sm" onClick={() => setOpenIds(new Set())}>Tutup semua</Button>
        </div>
      </div>

      {shippers.length === 0 ? (
        <Card>
          <Empty title="Belum ada booking di buku ini"
            sub="Klik 'Booking Baru' untuk membuat shipment pertama bulan ini."
            action={user ? <Button variant="primary" icon={<IconPlus size={14} />}
              onClick={() => navigate("/bookings/new", { state: { buku_id: buku.id, buku_periode: `${buku.tahun}/${String(buku.bulan).padStart(2, "0")}` } })}>Booking Baru</Button> : null} />
        </Card>
      ) : (
        shippers.map((g) => {
          const isOpen = getOpen().has(g.shipper);
          const pct = g.total_tagihan ? Math.round((g.total_paid / g.total_tagihan) * 100) : 0;
          return (
            <div key={g.shipper} className={`acc${isOpen ? " is-open" : ""}`}>
              <header className="acc__hd" onClick={() => toggle(g.shipper)}
                style={isFinance ? {} : { gridTemplateColumns: "auto 1fr auto" }}>
                <IconChevron size={14} className="acc__chev" />
                <div>
                  <div className="acc__name">{g.shipper}</div>
                  <div className="acc__sub">{g.bookings.length} booking</div>
                </div>
                {isFinance ? (
                  <>
                    <div className="acc__metric"><small>Tagihan</small><strong>{fmtRp(g.total_tagihan)}</strong></div>
                    <div className="acc__metric"><small>Dibayar</small><strong style={{ color: "var(--ok)" }}>{fmtRp(g.total_paid)}</strong></div>
                    <div className="acc__metric"><small>Sisa</small><strong style={{ color: g.sisa > 0 ? "var(--accent)" : "var(--ok)" }}>{fmtRp(g.sisa)}</strong></div>
                    <div className="row" style={{ gap: 8, alignItems: "center", minWidth: 120 }}>
                      <Progress value={g.total_paid} max={g.total_tagihan || 1} tone={pct === 100 ? "ok" : pct > 0 ? "warn" : "danger"} />
                      <span className="muted num" style={{ fontSize: 11, minWidth: 30, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </>
                ) : (
                  <span className="muted" style={{ fontSize: 12 }}>{g.bookings.length} booking</span>
                )}
              </header>
              {isOpen && (
                <div className="acc__body">
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
                      {g.bookings.map((bk) => (
                        <tr key={bk.id} className="is-clickable"
                          onClick={() => navigate(`/bookings/${bk.public_id}`, { state: { buku_id: buku.id, buku_periode: `${buku.tahun}/${String(buku.bulan).padStart(2, "0")}` } })}>
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
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
