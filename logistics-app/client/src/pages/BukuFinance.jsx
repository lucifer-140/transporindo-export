import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBuku } from "../api/buku.js";
import api from "../api/client.js";
import { Badge, Button, PageHeader, Card, Stat, Empty, fmtRp, RpCell } from "../components/ui.jsx";
import { IconPlus, IconChevron } from "../components/Icons.jsx";
import { exportShipperInvoice } from "../utils/invoicePdf.js";

export default function BukuFinance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["buku", id],
    queryFn: () => getBuku(id),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) return <div className="empty"><div className="empty__title">Memuat…</div></div>;
  if (isError) return <div className="empty"><div className="empty__title" style={{ color: "var(--danger)" }}>Gagal memuat data.</div></div>;

  const { buku, shippers, booking_count } = data;
  const periode = `${buku.tahun}/${String(buku.bulan).padStart(2, "0")}`;
  const grandTagihan = shippers.reduce((s, x) => s + x.total_tagihan, 0);
  const grandPaid    = shippers.reduce((s, x) => s + x.total_paid, 0);
  const grandSisa    = grandTagihan - grandPaid;

  function toggle(key) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Buku", onClick: () => navigate("/") },
          { label: `Buku ${periode}`, onClick: () => navigate(`/buku/${id}`) },
          { label: "Finance" },
        ]}
        title={`Finance — Buku ${periode}`}
        meta={<span className="row" style={{ gap: 8 }}><Badge status={buku.status} /><span>{booking_count} booking</span></span>}
        actions={
          <Button variant="primary" icon={<IconPlus size={14} />}
            onClick={() => navigate("/bookings/new", { state: { buku_id: buku.id, buku_periode: periode } })}>
            Booking Baru
          </Button>
        }
      />

      <div className="grid grid-stats mb-24">
        <Card pad={false}><Stat label="Total Tagihan" value={fmtRp(grandTagihan)} /></Card>
        <Card pad={false}><Stat label="Dibayar" value={fmtRp(grandPaid)} tone="ok" /></Card>
        <Card pad={false}><Stat label="Sisa" value={fmtRp(grandSisa)} tone={grandSisa > 0 ? "warn" : "ok"} /></Card>
      </div>

      {shippers.length === 0 ? (
        <Empty title="Belum ada booking" />
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {shippers.map((s) => (
            <div key={s.shipper} className={`acc${expanded[s.shipper] ? " is-open" : ""}`}>
              <div className="acc__hd" onClick={() => toggle(s.shipper)}>
                <IconChevron size={14} className="acc__chev" />
                <div>
                  <div className="acc__name">{s.shipper}</div>
                  <div className="acc__sub">{s.bookings.length} booking</div>
                </div>
                <div className="acc__metric"><small>Tagihan</small><strong>{fmtRp(s.total_tagihan)}</strong></div>
                <div className="acc__metric"><small>Dibayar</small><strong style={{ color: "var(--ok)" }}>{fmtRp(s.total_paid)}</strong></div>
                <div className="acc__metric"><small>Sisa</small><strong style={{ color: s.sisa > 0 ? "var(--accent)" : "var(--ok)" }}>{fmtRp(s.sisa)}</strong></div>
                <Badge status={s.status} />
                <button
                  className="btn btn--default btn--sm"
                  style={{ marginLeft: 4, flexShrink: 0 }}
                  onClick={(e) => { e.stopPropagation(); exportShipperInvoice(s, buku); api.post('/audit/download', { documentType: 'shipper_invoice', entityId: buku?.id ?? null }).catch(() => {}); }}
                  title="Export Invoice PDF"
                >
                  PDF
                </button>
              </div>

              {expanded[s.shipper] && (
                <div className="acc__body">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Job No</th><th>Status</th>
                        <th>Tagihan</th>
                        <th>Dibayar</th>
                        <th>Sisa</th>
                        <th>Piutang</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.bookings.map((b) => (
                        <tr key={b.id} className="is-clickable"
                          onClick={() => navigate(`/bookings/${b.public_id}`, { state: { buku_id: buku.id, buku_periode: periode } })}>
                          <td className="strong mono">{b.job_no}</td>
                          <td><Badge status={b.status} /></td>
                          <RpCell value={b.tagihan} />
                          <RpCell value={b.total_paid} style={{ color: "var(--ok)" }} />
                          <RpCell value={b.sisa} />
                          <td><Badge status={b.piutang_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
