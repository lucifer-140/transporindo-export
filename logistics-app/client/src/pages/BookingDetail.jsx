import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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



// ── Container card grid ──────────────────────────────────────────────────────
function ContainerGrid({ containers }) {
  if (!containers.length) return <Empty title="Belum ada container" />;
  return (
    <div className="ctr-grid">
      {containers.map((c, i) => (
        <div className="ctr-card" key={c.id ?? i}>
          <div className="ctr-card__hd">
            <span className="ctr-card__idx">CTR {String(i + 1).padStart(2, "0")}</span>
            <span className={`ctr-card__size${c.size === "40" ? " is-40" : c.size === "40HC" ? " is-hc" : ""}`}>{c.size}</span>
          </div>
          <div className="ctr-card__no">{c.container_no || <span className="dim">—</span>}</div>
          <div className="ctr-card__seal">
            <span>Seal</span>
            <span className="mono">{c.seal_no || "—"}</span>
          </div>
        </div>
      ))}
    </div>
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

// ── Finance tab panels ───────────────────────────────────────────────────────
function ShipmentTabPanel({ booking, containers, onEdit }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16 }}>
      <Card title="Informasi Shipment" action={<Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={onEdit}>Edit</Button>}>
        <div className="kv-grid">
          <div className="kv-grid__item"><div className="kv-grid__lbl">Shipper</div><div className="kv-grid__val">{booking.shipper || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Commodity</div><div className="kv-grid__val">{booking.commodity || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Port Muat</div><div className="kv-grid__val">{booking.port || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Port Discharge</div><div className={`kv-grid__val${booking.port_discharge ? "" : " dim"}`}>{booking.port_discharge || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Feeder</div><div className="kv-grid__val">{booking.feeder || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Vessel</div><div className="kv-grid__val">{booking.vessel_name || "—"} {booking.vessel_no && <span className="muted">/ {booking.vessel_no}</span>}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">In Date</div><div className={`kv-grid__val${booking.in_date ? "" : " dim"}`}>{booking.in_date ? fmtDate(booking.in_date) : "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Out Date</div><div className={`kv-grid__val${booking.out_date ? "" : " warn"}`}>{booking.out_date ? fmtDate(booking.out_date) : "Pending"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Trucking</div><div className="kv-grid__val">{booking.trucking || "—"}</div></div>
        </div>
        {booking.notes && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div className="kv-grid__lbl" style={{ marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{booking.notes}</div>
          </div>
        )}
      </Card>

      <Card title={`Containers — ${containers.length}`} action={<Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={onEdit}>Edit</Button>}>
        <ContainerGrid containers={containers} />
      </Card>
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

function PiutangTabPanel({ piutang, piutangPaid, piutangSisa, piutangSt, invoiceTotal, setPiutangMutation, setPiutangModal, setPayModal, deletePiutangPayMutation }) {
  const pct = piutang && piutang.jumlah > 0 ? Math.round((piutangPaid / piutang.jumlah) * 100) : 0;
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
            <Button variant="default" size="sm" onClick={() => setPiutangMutation.mutate({ jumlah: invoiceTotal })} disabled={!invoiceTotal || setPiutangMutation.isPending}>Set dari Invoice</Button>
            <Button variant="default" size="sm" onClick={() => setPiutangModal(true)}>Set Manual</Button>
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

function HutangTabPanel({ hutangList, setHutangModal, setPayModal, deleteHutangMutation, deleteHutangPayMutation }) {
  const totals = hutangList.reduce((acc, h) => {
    const paid = h.total_paid ?? 0;
    acc.total += h.jumlah; acc.paid += paid; acc.sisa += h.sisa ?? (h.jumlah - paid);
    return acc;
  }, { total: 0, paid: 0, sisa: 0 });
  const payCount = hutangList.reduce((a, h) => a + (h.pembayaran?.length ?? 0), 0);

  return (
    <>
      <div className="bd-money-hero">
        <div>
          <div className="bd-money-hero__lbl">Total Hutang</div>
          <div className="bd-money-hero__val">{fmtRp(totals.total)}</div>
          <div className="bd-money-hero__sub">{hutangList.length} vendor</div>
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

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, color: "var(--fg-2)", margin: 0 }}>Vendor</h3>
        <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setHutangModal(true)}>Tambah Hutang</Button>
      </div>

      {hutangList.length === 0 ? (
        <Card><Empty title="Belum ada hutang" sub="Catat tagihan dari vendor (trucking, pelabuhan, dll)." /></Card>
      ) : (
        <div className="bd-hutang-grid">
          {hutangList.map((h) => {
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
function WorkerView({ booking, containers, onEdit }) {
  function fmtCtr(ctrs) {
    const counts = {};
    for (const c of ctrs) counts[c.size] = (counts[c.size] ?? 0) + 1;
    const parts = Object.entries(counts).map(([s, n]) => `${n}× ${s}`);
    return `${ctrs.length} container${ctrs.length !== 1 ? "s" : ""}${parts.length ? ` (${parts.join(", ")})` : ""}`;
  }

  return (
    <>
      <Card title="Informasi Shipment" action={<Button variant="primary" size="sm" icon={<IconEdit size={12} />} onClick={onEdit}>Edit Booking</Button>} style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <Badge status={booking.status} />
        </div>
        <div className="kv-grid">
          <div className="kv-grid__item"><div className="kv-grid__lbl">Shipper</div><div className="kv-grid__val">{booking.shipper || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Commodity</div><div className="kv-grid__val">{booking.commodity || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Port Muat</div><div className="kv-grid__val">{booking.port || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Port Discharge</div><div className={`kv-grid__val${booking.port_discharge ? "" : " dim"}`}>{booking.port_discharge || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Trucking</div><div className="kv-grid__val">{booking.trucking || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Feeder</div><div className="kv-grid__val">{booking.feeder || "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Vessel</div><div className="kv-grid__val">{booking.vessel_name || "—"}{booking.vessel_no ? <span className="muted"> / {booking.vessel_no}</span> : ""}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">In Date</div><div className={`kv-grid__val${booking.in_date ? "" : " dim"}`}>{booking.in_date ? fmtDate(booking.in_date) : "—"}</div></div>
          <div className="kv-grid__item"><div className="kv-grid__lbl">Out Date</div><div className={`kv-grid__val${booking.out_date ? "" : " warn"}`}>{booking.out_date ? fmtDate(booking.out_date) : "Pending"}</div></div>
        </div>
        {booking.notes && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: "var(--bg-2)", borderLeft: "3px solid var(--accent)" }}>
            <div className="kv-grid__lbl" style={{ marginBottom: 6 }}>Catatan</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{booking.notes}</div>
          </div>
        )}
      </Card>

      <Card title={`Containers — ${fmtCtr(containers)}`}>
        <ContainerGrid containers={containers} />
      </Card>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isFinance } = useAuth();
  const toast = useToast();

  // Modal state
  const [payModal, setPayModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);
  const [piutangModal, setPiutangModal] = useState(false);
  const [hutangModal, setHutangModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pajakItemModal, setPajakItemModal] = useState(null);
  const [reimbItemModal, setReimbItemModal] = useState(null);

  // Finance tab state
  const [tab, setTab] = useState("shipment");

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }); setPayModal(null); },
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

      {isFinance ? (
        <>
          {/* KPI stats — always visible above tabs */}
          <div className="bd-money-hero" style={{ marginBottom: 18 }}>
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
          </div>

          {/* Tabs */}
          <div className="bd-tabs" role="tablist">
            <button role="tab" className={`bd-tab ${tab === "shipment" ? "is-active" : ""}`} onClick={() => setTab("shipment")}>
              <IcBox size={13} /> Shipment
            </button>
            <button role="tab" className={`bd-tab ${tab === "dokumen" ? "is-active" : ""}`} onClick={() => setTab("dokumen")}>
              <IcList size={13} /> Dokumen
            </button>
            <button role="tab" className={`bd-tab ${tab === "invoice" ? "is-active" : ""}`} onClick={() => setTab("invoice")}>
              <IcList size={13} /> Invoice
              <span className="bd-tab__count">{dokumen.length}</span>
            </button>
            <button role="tab" className={`bd-tab ${tab === "piutang" ? "is-active" : ""}`} onClick={() => setTab("piutang")}>
              <IcDown size={13} style={{ transform: "rotate(180deg)" }} /> Piutang
            </button>
            <button role="tab" className={`bd-tab ${tab === "hutang" ? "is-active" : ""}`} onClick={() => setTab("hutang")}>
              <IcUp size={13} style={{ transform: "rotate(180deg)" }} /> Hutang
              <span className="bd-tab__count">{hutangList.length}</span>
            </button>
            <button role="tab" className={`bd-tab ${tab === "pajak" ? "is-active" : ""}`} onClick={() => setTab("pajak")}>
              <IcList size={13} /> Pajak &amp; Reimb.
            </button>
          </div>

          {tab === "shipment" && <ShipmentTabPanel booking={booking} containers={containers} onEdit={onEdit} />}
          {tab === "dokumen"  && <BookingDocuments bookingId={id} canEdit={true} />}
          {tab === "invoice"  && <InvoiceTabPanel  dokumen={dokumen} invoiceTotal={invoiceTotal} setItemModal={setItemModal} deleteItemMutation={deleteItemMutation} onExportInvoice={() => { exportInvoiceOnly(booking, dokumen); api.post('/audit/download', { documentType: 'invoice', bookingId: booking?.id }).catch(() => {}); }} />}
          {tab === "piutang"  && <PiutangTabPanel  piutang={piutang} piutangPaid={piutangPaid} piutangSisa={piutangSisa} piutangSt={piutangSt} invoiceTotal={invoiceTotal} setPiutangMutation={setPiutangMutation} setPiutangModal={setPiutangModal} setPayModal={setPayModal} deletePiutangPayMutation={deletePiutangPayMutation} />}
          {tab === "hutang"   && <HutangTabPanel   hutangList={hutangList} setHutangModal={setHutangModal} setPayModal={setPayModal} deleteHutangMutation={deleteHutangMutation} deleteHutangPayMutation={deleteHutangPayMutation} />}
          {tab === "pajak"   && (
            <div className="col" style={{ gap: 16 }}>
              <InvoicePajakTabPanel booking={booking} invoicePajak={invoicePajak} invoiceTotal={invoiceTotal} reimbTotal={notaReimbursement?.total ?? 0} onCreate={() => createInvoicePajakMutation.mutate()} onDelete={() => deleteInvoicePajakMutation.mutate()} setPajakItemModal={setPajakItemModal} deleteItemMutation={deletePajakItemMutation} />
              <ReimbursementTabPanel booking={booking} notaReimbursement={notaReimbursement} invoiceTotal={invoiceTotal} pajakTotal={invoicePajak?.total_nilai_penyerahan ?? 0} onCreate={() => createNotaMutation.mutate()} onDelete={() => deleteNotaMutation.mutate()} setReimbItemModal={setReimbItemModal} deleteItemMutation={deleteReimbItemMutation} />
              <ReconciliationBanner invoiceTotal={invoiceTotal} pajakTotal={invoicePajak?.total_nilai_penyerahan ?? 0} reimbTotal={notaReimbursement?.total ?? 0} />
            </div>
          )}
        </>
      ) : (
        <WorkerView booking={booking} containers={containers} onEdit={onEdit} />
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

      <HutangFormModal
        open={hutangModal} onClose={() => setHutangModal(false)}
        isPending={addHutangMutation.isPending}
        onSave={(data) => addHutangMutation.mutate(data)}
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
