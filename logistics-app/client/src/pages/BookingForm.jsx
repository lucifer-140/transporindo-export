import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { Button, PageHeader, Card, Field, Input, Select } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconCheck } from '../components/Icons.jsx';
import { BookingFormSkeleton } from '../components/Skeleton.jsx';

export default function BookingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const bukuState = location.state ?? {};
  const [form, setForm] = useState({
    job_no: '', shipper: '', commodity: '',
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

  useEffect(() => {
    if (existing) {
      const b = existing.booking;
      setForm({
        job_no: b.job_no, shipper: b.shipper, commodity: b.commodity ?? '',
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

  function validate() {
    const errs = {};
    if (!isEdit && !form.buku_id) errs.buku_id = 'Buku wajib dipilih';
    if (!form.job_no.trim()) errs.job_no = 'Wajib diisi';
    if (!form.shipper.trim()) errs.shipper = 'Wajib diisi';
    return errs;
  }

  function handleSubmit(e) {
    e?.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    mutation.mutate({ ...form, buku_id: parseInt(form.buku_id), containers: [] });
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
              <Field label="Lokasi Muat">
                <Input value={form.lokasi_muat} onChange={set('lokasi_muat')} placeholder="Lokasi pemuatan barang" />
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
