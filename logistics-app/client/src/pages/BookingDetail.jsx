import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import { useAuth } from "../hooks/useAuth.js";
import { Badge, Button, Card, PageHeader, Empty, Modal, Field, Input, Select, Stat, Progress, fmtRp, fmtDate } from "../components/ui.jsx";
import { IconEdit, IconTrash, IconPlus, IconChevron, IconMore } from "../components/Icons.jsx";

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
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!tipe || !harga || isPending} onClick={() => onSave({ tipe, qty, harga_satuan: harga })}>{item?.id ? "Save" : "Add"}</Button></>}>
      <div className="col" style={{ gap: 14 }}>
        <Field label="Uraian (Deskripsi biaya)" required><Input value={tipe} onChange={(e) => setTipe(e.target.value)} placeholder="Biaya Handling Container 40ft" /></Field>
        <div className="grid grid-form-2">
          <Field label="Qty" required><Input type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} /></Field>
          <Field label="Harga Satuan (Rp)" required><Input type="number" min={0} value={harga} onChange={(e) => setHarga(+e.target.value)} /></Field>
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
        {invoiceTotal > 0 && <p className="muted" style={{ fontSize: 12 }}>Total invoice: <strong className="num">{fmtRp(invoiceTotal)}</strong>.</p>}
      </div>
    </Modal>
  );
}

function HutangFormModal({ open, onClose, onSave, isPending }) {
  const [pihak, setPihak] = useState("");
  const [jumlah, setJumlah] = useState(0);
  const [keterangan, setKeterangan] = useState("");
  useEffect(() => { if (open) { setPihak(""); setJumlah(0); setKeterangan(""); } }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Tambah Hutang Vendor"
      footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" disabled={!pihak || !jumlah || isPending} onClick={() => onSave({ pihak, jumlah, keterangan })}>Tambah</Button></>}>
      <div className="grid grid-form-2">
        <Field label="Pihak / Vendor" required span={2}><Input value={pihak} onChange={(e) => setPihak(e.target.value)} placeholder="Nama vendor" /></Field>
        <Field label="Jumlah (Rp)" required><Input type="number" min={1} value={jumlah} onChange={(e) => setJumlah(+e.target.value)} /></Field>
        <Field label="Keterangan"><Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isFinance, isAdmin } = useAuth();

  // Modal state
  const [payModal, setPayModal] = useState(null); // { kind: 'piutang' } | { kind: 'hutang', hutangId, sisa }
  const [itemModal, setItemModal] = useState(null); // null | { id?, tipe, qty, harga_satuan }
  const [piutangModal, setPiutangModal] = useState(false);
  const [hutangModal, setHutangModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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

  // Mutations
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["booking", id] });
    queryClient.invalidateQueries({ queryKey: ["dokumen", id] });
    queryClient.invalidateQueries({ queryKey: ["piutang", id] });
    queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/bookings/${id}`),
    onSuccess: () => navigate(location.state?.buku_id ? `/buku/${location.state.buku_id}` : "/"),
  });

  const addItemMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${id}/dokumen`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dokumen", id] }); setItemModal(null); },
  });

  const editItemMutation = useMutation({
    mutationFn: ({ itemId, body }) => api.put(`/bookings/${id}/dokumen/${itemId}`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["dokumen", id] }); setItemModal(null); },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => api.delete(`/bookings/${id}/dokumen/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dokumen", id] }),
  });

  const setPiutangMutation = useMutation({
    mutationFn: (body) => piutang
      ? api.put(`/bookings/${id}/piutang/${piutang.id}`, body).then((r) => r.data)
      : api.post(`/bookings/${id}/piutang`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["piutang", id] }); setPiutangModal(false); },
  });

  const addPiutangPayMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${id}/piutang/${piutang.id}/pembayaran`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["piutang", id] }); setPayModal(null); },
  });

  const deletePiutangPayMutation = useMutation({
    mutationFn: (payId) => api.delete(`/bookings/${id}/piutang/${piutang.id}/pembayaran/${payId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["piutang", id] }),
  });

  const editPiutangPayMutation = useMutation({
    mutationFn: ({ payId, body }) => api.put(`/bookings/${id}/piutang/${piutang.id}/pembayaran/${payId}`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["piutang", id] }); setPayModal(null); },
  });

  const addHutangMutation = useMutation({
    mutationFn: (body) => api.post("/hutang", { ...body, booking_id: parseInt(id) }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }); setHutangModal(false); },
  });

  const deleteHutangMutation = useMutation({
    mutationFn: (hutangId) => api.delete(`/hutang/${hutangId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }),
  });

  const addHutangPayMutation = useMutation({
    mutationFn: ({ hutangId, body }) => api.post(`/hutang/${hutangId}/pembayaran`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }); setPayModal(null); },
  });

  const deleteHutangPayMutation = useMutation({
    mutationFn: ({ hutangId, payId }) => api.delete(`/hutang/${hutangId}/pembayaran/${payId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }),
  });

  const editHutangPayMutation = useMutation({
    mutationFn: ({ hutangId, payId, body }) => api.put(`/hutang/${hutangId}/pembayaran/${payId}`, body).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hutang-booking", id] }); setPayModal(null); },
  });

  if (isLoading) return <div className="empty"><div className="empty__title">Memuat…</div></div>;
  if (!bookingData) return <div className="empty"><div className="empty__title" style={{ color: "var(--danger)" }}>Booking tidak ditemukan.</div></div>;

  const { booking, containers } = bookingData;
  const invoiceTotal = dokumen.reduce((s, d) => s + (d.biaya || 0), 0);
  const piutangPaid = piutang?.total_paid ?? 0;
  const piutangSisa = piutang ? Math.max(0, piutang.jumlah - piutangPaid) : 0;
  const piutangSt = piutang?.status ?? "none";

  const bukuState = location.state ?? {};
  const crumbs = [
    { label: "Buku", onClick: () => navigate("/") },
    ...(bukuState.buku_id ? [{ label: `Buku ${bukuState.buku_periode ?? ""}`, onClick: () => navigate(`/buku/${bukuState.buku_id}`) }] : []),
    { label: booking.job_no },
  ];

  function fmtCtr(ctrs) {
    const counts = {};
    for (const c of ctrs) counts[c.size] = (counts[c.size] ?? 0) + 1;
    const parts = Object.entries(counts).map(([s, n]) => `${n}× ${s}`);
    return `${ctrs.length} container${ctrs.length !== 1 ? "s" : ""}${parts.length ? ` (${parts.join(", ")})` : ""}`;
  }

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
            <Button variant="default" icon={<IconEdit size={14} />} onClick={() => navigate(`/bookings/${id}/edit`, { state: bukuState })}>Edit</Button>
            {showDelete ? (
              <>
                <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Hapus?</span>
                <Button variant="danger" size="sm" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>Ya, Hapus</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>Batal</Button>
              </>
            ) : (
              <Button variant="ghost" icon={<IconMore size={14} />} onClick={() => setShowDelete(true)} />
            )}
          </div>
        }
      />

      {isFinance && (
        <div className="grid grid-stats mb-24">
          <Card pad={false}><Stat label="Total Invoice" value={fmtRp(invoiceTotal)} sub={`${dokumen.length} line items`} /></Card>
          <Card pad={false}><Stat label="Piutang" value={fmtRp(piutang?.jumlah ?? 0)} sub={<Badge status={piutangSt === "none" ? "muted" : piutangSt} dot={false} />} /></Card>
          <Card pad={false}><Stat label="Dibayar" value={fmtRp(piutangPaid)} tone="ok" sub={`${piutang?.pembayaran?.length ?? 0} pembayaran`} /></Card>
          <Card pad={false}><Stat label="Sisa Piutang" value={fmtRp(piutangSisa)} tone={piutangSisa > 0 ? "warn" : "ok"} sub={piutangSisa <= 0 ? "Sudah lunas" : "Belum tertagih"} /></Card>
        </div>
      )}

      {!isFinance && (
        <div className="grid grid-stats mb-24">
          <Card pad={false}><Stat label="Status" value={<Badge status={booking.status} />} sub="Shipment status" /></Card>
          <Card pad={false}><Stat label="Containers" value={containers.length} sub={fmtCtr(containers)} /></Card>
          <Card pad={false}><Stat label="In Date" value={booking.in_date ? fmtDate(booking.in_date) : "—"} sub="Tanggal masuk" /></Card>
          <Card pad={false}><Stat label="Out Date" value={booking.out_date ? fmtDate(booking.out_date) : "Pending"} tone={booking.out_date ? "ok" : "warn"} sub="Tanggal keluar" /></Card>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: isFinance ? "minmax(0, 1.6fr) minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 16 }}>
        {/* LEFT column */}
        <div className="col" style={{ gap: 16 }}>
          {/* Shipment info */}
          <Card title="Informasi Shipment" action={<Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => navigate(`/bookings/${id}/edit`, { state: bukuState })}>Edit</Button>}>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              <dl className="dl">
                <dt>Shipper</dt><dd>{booking.shipper || "—"}</dd>
                <dt>Commodity</dt><dd>{booking.commodity || "—"}</dd>
                <dt>PEB</dt><dd className="mono" style={{ fontSize: 12 }}>{booking.peb || "—"}</dd>
                <dt>BON</dt><dd className="mono" style={{ fontSize: 12 }}>{booking.bon || "—"}</dd>
                <dt>Port</dt><dd>{booking.port || "—"}</dd>
              </dl>
              <dl className="dl">
                <dt>Feeder</dt><dd>{booking.feeder || "—"}</dd>
                <dt>Vessel</dt><dd>{booking.vessel_name || "—"}{booking.vessel_no ? <span className="muted"> / {booking.vessel_no}</span> : ""}</dd>
                <dt>In Date</dt><dd className="num">{booking.in_date ? fmtDate(booking.in_date) : <span className="dim">—</span>}</dd>
                <dt>Out Date</dt><dd className={booking.out_date ? "num" : "dim"}>{booking.out_date ? fmtDate(booking.out_date) : "Pending"}</dd>
                <dt>Trucking</dt><dd>{booking.trucking || "—"}</dd>
              </dl>
            </div>
            {booking.notes && <div className="mt-16 muted" style={{ fontSize: 12.5, whiteSpace: "pre-wrap" }}>{booking.notes}</div>}
          </Card>

          {/* Containers */}
          <Card title={`Containers — ${fmtCtr(containers)}`} action={<Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => navigate(`/bookings/${id}/edit`, { state: bukuState })}>Edit</Button>}>
            {containers.length === 0 ? (
              <Empty title="Belum ada container" />
            ) : (
              <div className="ctr-list">
                <div className="ctr-list__hd">
                  <div>#</div><div>Container No</div><div>Seal No</div><div>Size</div>
                </div>
                {containers.map((c, i) => (
                  <div className="ctr-row" key={c.id}>
                    <div className="ctr-row__idx">{String(i + 1).padStart(2, "0")}</div>
                    <div className="ctr-row__no">{c.container_no}</div>
                    <div className="ctr-row__seal">{c.seal_no || "—"}</div>
                    <div className={`ctr-row__size${c.size === "40" ? " is-40" : ""}${c.size === "40HC" ? " is-hc" : ""}`}>{c.size}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Invoice — finance only */}
          {isFinance && (
            <Card title={`Invoice — ${dokumen.length} item`} action={<Button variant="ghost" size="sm" icon={<IconPlus size={12} />} onClick={() => setItemModal({ tipe: "", qty: 1, harga_satuan: 0 })}>Add Item</Button>} pad={false}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Uraian</th>
                    <th className="right" style={{ width: 70 }}>Qty</th>
                    <th className="right" style={{ width: 140 }}>Harga Satuan</th>
                    <th className="right" style={{ width: 140 }}>Subtotal</th>
                    <th style={{ width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {dokumen.map((d) => (
                    <tr key={d.id}>
                      <td className="strong">{d.tipe}</td>
                      <td className="right num">{d.qty}</td>
                      <td className="right num">{fmtRp(d.harga_satuan ?? 0)}</td>
                      <td className="right num strong">{fmtRp(d.biaya ?? 0)}</td>
                      <td>
                        <div className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                          <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => setItemModal({ id: d.id, tipe: d.tipe, qty: d.qty, harga_satuan: d.harga_satuan })} />
                          <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => deleteItemMutation.mutate(d.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {dokumen.length === 0 && <tr><td colSpan={5}><Empty title="Belum ada line item" sub="Tambahkan biaya yang akan ditagih ke shipper." /></td></tr>}
                </tbody>
                {dokumen.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ textAlign: "right", color: "var(--fg-3)", fontWeight: 500 }}>Total</td>
                      <td className="right num strong" style={{ fontSize: 15 }}>{fmtRp(invoiceTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </Card>
          )}
        </div>

        {/* RIGHT column — finance only */}
        {isFinance && (
          <div className="col" style={{ gap: 16 }}>
            {/* Piutang card */}
            <Card title={<span className="row" style={{ gap: 8 }}>Piutang <Badge status={piutangSt === "none" ? "muted" : piutangSt} /></span>}
              action={
                <div className="row" style={{ gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => setPiutangMutation.mutate({ jumlah: invoiceTotal })} disabled={!invoiceTotal || setPiutangMutation.isPending}>Dari Invoice</Button>
                  <Button variant="ghost" size="sm" onClick={() => setPiutangModal(true)}>Set Manual</Button>
                </div>
              }>
              {piutang ? (
                <>
                  <div className="row" style={{ alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div className="muted" style={{ fontSize: 11 }}>Total piutang</div>
                      <div className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmtRp(piutang.jumlah)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="muted" style={{ fontSize: 11 }}>Sisa</div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 600, color: piutangSisa > 0 ? "var(--accent)" : "var(--ok)" }}>{fmtRp(piutangSisa)}</div>
                    </div>
                  </div>
                  <Progress value={piutangPaid} max={piutang.jumlah || 1} tone={piutangSt === "lunas" ? "ok" : piutangSt === "sebagian" ? "warn" : "danger"} />
                  <div className="muted mt-8" style={{ fontSize: 11.5 }}>
                    {fmtRp(piutangPaid)} dari {fmtRp(piutang.jumlah)} terbayar
                    {piutang.jumlah > 0 && ` (${Math.round((piutangPaid / piutang.jumlah) * 100)}%)`}
                  </div>

                  <hr style={{ margin: "14px 0", borderColor: "var(--border)", borderTop: 0 }} />

                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                    <div className="field__lbl" style={{ margin: 0 }}>Riwayat Pembayaran</div>
                    <Button variant="primary" size="sm" icon={<IconPlus size={12} />}
                      onClick={() => setPayModal({ kind: "piutang", label: "Tambah Pembayaran Piutang", sisa: piutangSisa })}>
                      Tambah
                    </Button>
                  </div>

                  {piutang.pembayaran?.length > 0 ? (
                    <div className="col" style={{ gap: 8 }}>
                      {piutang.pembayaran.map((p) => (
                        <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, padding: "10px 12px", borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                          <div>
                            <div className="strong num" style={{ fontSize: 14 }}>{fmtRp(p.jumlah)}</div>
                            <div className="muted" style={{ fontSize: 11.5 }}>{fmtDate(p.tanggal)} · {p.metode}{p.keterangan ? ` — ${p.keterangan}` : ""}</div>
                          </div>
                          <div className="row" style={{ gap: 2 }}>
                            <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => setPayModal({ kind: "piutang", label: "Edit Pembayaran Piutang", editPayId: p.id, initialData: p })} />
                            <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => deletePiutangPayMutation.mutate(p.id)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty title="Belum ada pembayaran" />
                  )}
                </>
              ) : (
                <Empty title="Belum ada piutang" sub="Klik 'Set Piutang' untuk membuat tagihan." />
              )}
            </Card>

            {/* Hutang card */}
            <Card title={`Hutang — ${hutangList.length} vendor`} action={<Button variant="ghost" size="sm" icon={<IconPlus size={12} />} onClick={() => setHutangModal(true)}>Add</Button>}>
              {hutangList.length === 0 ? (
                <Empty title="Belum ada hutang" sub="Catat tagihan dari vendor (trucking, pelabuhan, dll)." />
              ) : (
                <div className="col" style={{ gap: 10 }}>
                  {hutangList.map((h) => {
                    const paid = h.total_paid ?? 0;
                    const sisa = h.sisa ?? 0;
                    const st = h.status;
                    return (
                      <div key={h.id} style={{ padding: 12, borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div className="strong">{h.pihak}</div>
                            {h.keterangan && <div className="muted" style={{ fontSize: 11.5 }}>{h.keterangan}</div>}
                          </div>
                          <div className="row" style={{ gap: 4 }}>
                            <Badge status={st} />
                            <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => deleteHutangMutation.mutate(h.id)} />
                          </div>
                        </div>
                        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                          <span className="muted" style={{ fontSize: 11.5 }}>Total <span className="num strong" style={{ color: "var(--fg)" }}>{fmtRp(h.jumlah)}</span></span>
                          <span className="muted" style={{ fontSize: 11.5 }}>Sisa <span className="num strong" style={{ color: sisa > 0 ? "var(--accent)" : "var(--ok)" }}>{fmtRp(sisa)}</span></span>
                        </div>
                        <Progress value={paid} max={h.jumlah || 1} tone={st === "lunas" ? "ok" : st === "sebagian" ? "warn" : "danger"} />
                        <div className="row mt-8" style={{ justifyContent: "space-between" }}>
                          <span className="muted" style={{ fontSize: 11 }}>{h.pembayaran?.length ?? 0} pembayaran</span>
                          <Button variant="ghost" size="sm" icon={<IconPlus size={12} />}
                            onClick={() => setPayModal({ kind: "hutang", label: "Tambah Pembayaran Hutang", hutangId: h.id, sisa })}>
                            Bayar
                          </Button>
                        </div>
                        {h.pembayaran?.length > 0 && (
                          <div className="col mt-8" style={{ gap: 6 }}>
                            {h.pembayaran.map((p) => (
                              <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, padding: "8px 10px", borderRadius: 8, background: "var(--bg-3, var(--bg))", border: "1px solid var(--border)" }}>
                                <div>
                                  <div className="strong num" style={{ fontSize: 13 }}>{fmtRp(p.jumlah)}</div>
                                  <div className="muted" style={{ fontSize: 11 }}>{fmtDate(p.tanggal)} · {p.metode}{p.keterangan ? ` — ${p.keterangan}` : ""}</div>
                                </div>
                                <div className="row" style={{ gap: 2 }}>
                                  <Button variant="ghost" size="sm" icon={<IconEdit size={11} />}
                                    onClick={() => setPayModal({ kind: "hutang", label: "Edit Pembayaran Hutang", hutangId: h.id, sisa, editPayId: p.id, initialData: p })} />
                                  <Button variant="ghost" size="sm" icon={<IconTrash size={11} />}
                                    onClick={() => deleteHutangPayMutation.mutate({ hutangId: h.id, payId: p.id })} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

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
