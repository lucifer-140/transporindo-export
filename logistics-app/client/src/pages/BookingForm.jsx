import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { Button, PageHeader, Card, Field, Input, Select } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconCheck } from '../components/Icons.jsx';
import { BookingFormSkeleton } from '../components/Skeleton.jsx';
import { LOKASI_OPTIONS } from '../data/tarif.js';

export default function BookingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const bukuState = location.state ?? {};
  const [form, setForm] = useState({
    job_no: '', shipper: '', commodity: '',
    qty_20: '0', qty_40: '0', qty_40hc: '0',
    port: 'Belawan', port_discharge: '', lokasi_muat: '',
    notes: '', buku_id: bukuState.buku_id ?? '',
  });
  const [errors, setErrors] = useState({});

  const { data: existing, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: shippers = [], isLoading: isLoadingShippers } = useQuery({
    queryKey: ['shippers'],
    queryFn: () => api.get('/shippers').then(r => r.data),
  });

  const selectedShipper = shippers.find(s => s.name === form.shipper);
  const shipperCommodities = selectedShipper?.commodities ?? [];

  function handleShipperChange(name) {
    const s = shippers.find(sh => sh.name === name);
    const commodities = s?.commodities ?? [];
    setForm(f => ({ ...f, shipper: name, commodity: commodities.length === 1 ? commodities[0].name : '' }));
  }

  function parseQty(str) {
    const map = {};
    if (str) for (const p of str.split(',')) {
      const m = p.trim().match(/^(\d+)x(\d+)(hc|HC|ft)?$/i);
      if (m) { const hc = m[3] && m[3].toUpperCase() === 'HC'; map[hc ? '40HC' : m[2] + 'ft'] = parseInt(m[1]); }
    }
    return { qty_20: String(map['20ft'] ?? 0), qty_40: String(map['40ft'] ?? 0), qty_40hc: String(map['40HC'] ?? 0) };
  }

  useEffect(() => {
    if (existing) {
      const b = existing.booking;
      setForm({
        job_no: b.job_no, shipper: b.shipper, commodity: b.commodity ?? '',
        ...parseQty(b.planned_qty ?? ''),
        port: b.port ?? '', port_discharge: b.port_discharge ?? '',
        lokasi_muat: b.lokasi_muat ?? '',
        notes: b.notes ?? '', buku_id: b.buku_id ?? '',
      });
    }
  }, [existing]);

  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/bookings/${id}`, data).then(r => r.data)
      : api.post('/bookings', data).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      toast(isEdit ? 'Booking berhasil diperbarui.' : 'Booking berhasil dibuat.');
      navigate(`/bookings/${data.booking.public_id}`);
    },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menyimpan booking.', 'error'),
  });

  if (isEdit && (isLoadingBooking || isLoadingShippers)) return <BookingFormSkeleton />;

  function serializeQty() {
    const parts = [];
    if (parseInt(form.qty_20) > 0) parts.push(`${form.qty_20}x20ft`);
    if (parseInt(form.qty_40) > 0) parts.push(`${form.qty_40}x40ft`);
    if (parseInt(form.qty_40hc) > 0) parts.push(`${form.qty_40hc}x40HC`);
    return parts.join(', ');
  }

  function validate() {
    const errs = {};
    if (!isEdit && !form.buku_id) errs.buku_id = 'Buku wajib dipilih';
    if (!form.job_no.trim()) errs.job_no = 'Wajib diisi';
    if (!form.shipper.trim()) errs.shipper = 'Wajib diisi';
    if (parseInt(form.qty_20) === 0 && parseInt(form.qty_40) === 0 && parseInt(form.qty_40hc) === 0)
      errs.qty = 'Qty wajib diisi (min 1 container)';
    return errs;
  }

  function handleSubmit(e) {
    e?.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    mutation.mutate({
      job_no: form.job_no, shipper: form.shipper, commodity: form.commodity,
      planned_qty: serializeQty(),
      port: form.port, port_discharge: form.port_discharge,
      lokasi_muat: form.lokasi_muat, notes: form.notes,
      buku_id: parseInt(form.buku_id), containers: [],
    });
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const buku = bukuState.buku_periode;

  return (
    <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') e.preventDefault(); }}>
      <PageHeader
        crumbs={[
          buku ? { label: buku, onClick: () => navigate(-1) } : { label: 'Bookings', onClick: () => navigate('/bookings') },
          { label: isEdit ? 'Edit Booking' : 'Booking Baru' },
        ]}
        title={isEdit ? 'Edit Booking' : 'Booking Baru'}
        meta={isEdit ? `Editing ${form.job_no}` : 'Catat shipment ekspor baru.'}
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Batal</Button>
            <Button type="submit" variant="primary" icon={<IconCheck size={14} />} disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan…' : isEdit ? 'Save Changes' : 'Create Booking'}
            </Button>
          </>
        }
      />

      <div className="col" style={{ gap: 16, maxWidth: 720 }}>

          <Card title="Identitas Booking">
            {!isEdit && (
              <div style={{ marginBottom: 14 }}>
                <div className="field__lbl">Buku (Periode)</div>
                {buku ? (
                  <div className="inp inp--readonly">{buku}</div>
                ) : (
                  <div className="inp inp--error">
                    Buku tidak dipilih —{' '}
                    <button type="button" className="btn-link" onClick={() => navigate('/buku')}>pilih dari halaman Buku</button>
                  </div>
                )}
                {errors.buku_id && <p className="inp__error">{errors.buku_id}</p>}
              </div>
            )}
            <div className="grid grid-form-2">
              <Field label="Job No" required error={errors.job_no}>
                <Input value={form.job_no} onChange={set('job_no')} hasError={!!errors.job_no} />
              </Field>
              <Field label="Shipper" required error={errors.shipper}>
                <Select value={form.shipper} onChange={e => handleShipperChange(e.target.value)} hasError={!!errors.shipper}>
                  <option value="">— Pilih shipper —</option>
                  {shippers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Commodity">
                {shipperCommodities.length === 1 ? (
                  <div className="inp inp--readonly">{form.commodity}</div>
                ) : (
                  <Select value={form.commodity} onChange={set('commodity')} disabled={!form.shipper || shipperCommodities.length === 0}>
                    <option value="">— Pilih commodity —</option>
                    {shipperCommodities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Qty" required error={errors.qty} span={2}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 320 }}>
                  {[['20ft', 'qty_20'], ['40ft', 'qty_40'], ['40HC', 'qty_40hc']].map(([label, key]) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--fg-2)', fontWeight: 600 }}>{label}</span>
                      <input
                        type="number" min="0" max="99"
                        className={`inp${errors.qty ? ' inp--error' : ''}`}
                        style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, padding: '6px 8px' }}
                        value={form[key]}
                        onChange={set(key)}
                      />
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Lokasi Muat">
                <Select value={form.lokasi_muat} onChange={set('lokasi_muat')}>
                  <option value="">— Pilih lokasi muat —</option>
                  {!LOKASI_OPTIONS.includes(form.lokasi_muat) && form.lokasi_muat && <option value={form.lokasi_muat}>{form.lokasi_muat}</option>}
                  {LOKASI_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Notes" span={2}>
                <textarea className="inp" rows={3} value={form.notes} onChange={set('notes')} placeholder="Catatan tambahan (opsional)" />
              </Field>
            </div>
          </Card>

          {mutation.isError && (
            <p className="inp__error">{mutation.error?.response?.data?.error ?? 'Gagal menyimpan.'}</p>
          )}
      </div>
    </form>
  );
}
