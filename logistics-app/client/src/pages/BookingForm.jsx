import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { Button, PageHeader, Card, Field, Input, Select, fmtDate, monthLabel } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconPlus, IconTrash, IconCheck } from '../components/Icons.jsx';
import { BookingFormSkeleton } from '../components/Skeleton.jsx';

const EMPTY_CONTAINER = () => ({ container_no: '', seal_no: '', size: '40ft' });

function deriveQty(containers) {
  const counts = {};
  for (const c of containers) if (c.container_no) counts[c.size] = (counts[c.size] ?? 0) + 1;
  return Object.entries(counts).map(([s, n]) => `${n}× ${s}`).join(', ') || '—';
}

export default function BookingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const bukuState = location.state ?? {};
  const [form, setForm] = useState({
    job_no: '', shipper: '', commodity: '', port: 'Belawan', port_discharge: '', feeder: '',
    vessel_name: '', vessel_no: '', in_date: '', out_date: '', trucking: '', notes: '',
    buku_id: bukuState.buku_id ?? '',
  });
  const [containers, setContainers] = useState([EMPTY_CONTAINER()]);
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
        port: b.port ?? '', port_discharge: b.port_discharge ?? '', feeder: b.feeder ?? '',
        vessel_name: b.vessel_name ?? '', vessel_no: b.vessel_no ?? '',
        in_date: b.in_date ?? '', out_date: b.out_date ?? '',
        trucking: b.trucking ?? '', notes: b.notes ?? '', buku_id: b.buku_id ?? '',
      });
      setContainers(existing.containers.length
        ? existing.containers.map(c => ({ container_no: c.container_no, seal_no: c.seal_no ?? '', size: c.size }))
        : [EMPTY_CONTAINER()]);
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
    containers.filter(c => c.container_no.trim()).forEach((c, i) => {
      if (!/^[A-Z]{4}[0-9]{7}$/.test(c.container_no)) errs[`container_${i}`] = `Baris ${i + 1}: format ABCD1234567`;
    });
    return errs;
  }

  function handleSubmit(e) {
    e?.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const validContainers = containers.filter(c => c.container_no.trim());
    mutation.mutate({ ...form, buku_id: parseInt(form.buku_id), containers: validContainers });
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setC = (i, k) => (e) => setContainers(cs => cs.map((c, idx) => idx === i ? { ...c, [k]: e.target.value } : c));
  const removeContainer = (i) => setContainers(cs => cs.filter((_, idx) => idx !== i));
  const addContainer = () => setContainers(cs => [...cs, EMPTY_CONTAINER()]);

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

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>

          {/* Identitas Booking */}
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
            </div>
          </Card>

          {/* Pelayaran */}
          <Card title="Pelayaran">
            <div className="grid grid-form-2">
              <Field label="Port Muat (Pelabuhan Muat)"><Input value={form.port} onChange={set('port')} /></Field>
              <Field label="Port Discharge"><Input value={form.port_discharge} onChange={set('port_discharge')} /></Field>
              <Field label="Feeder"><Input value={form.feeder} onChange={set('feeder')} placeholder="Nama feeder vessel" /></Field>
              <Field label="Vessel Name"><Input value={form.vessel_name} onChange={set('vessel_name')} placeholder="Nama kapal utama" /></Field>
              <Field label="Vessel No / Voyage"><Input value={form.vessel_no} onChange={set('vessel_no')} placeholder="Nomor voyage" /></Field>
            </div>
          </Card>

          {/* Jadwal & Trucking */}
          <Card title="Jadwal & Trucking">
            <div className="grid grid-form-2">
              <Field label="In Date" hint="Kontainer masuk depot">
                <Input type="date" value={form.in_date} onChange={set('in_date')} />
              </Field>
              <Field label="Out Date" hint="Kontainer keluar / loaded on board">
                <Input type="date" value={form.out_date} onChange={set('out_date')} />
              </Field>
              <Field label="Trucking" span={2}>
                <Input value={form.trucking} onChange={set('trucking')} placeholder="Nama perusahaan trucking" />
              </Field>
              <Field label="Notes" span={2}>
                <textarea className="inp" rows={3} value={form.notes} onChange={set('notes')} placeholder="Catatan tambahan (opsional)" />
              </Field>
            </div>
          </Card>

          {/* Containers */}
          <Card title={`Containers (${containers.length})`}
            action={<Button type="button" variant="ghost" size="sm" icon={<IconPlus size={12} />} onClick={addContainer}>Add Container</Button>}>
            <div className="col" style={{ gap: 10 }}>
              {containers.map((c, i) => (
                <div key={i}>
                  <div className="grid" style={{ gridTemplateColumns: '24px 1fr 1fr 110px 32px', gap: 10, alignItems: 'end' }}>
                    <div className="muted num" style={{ fontSize: 12, paddingBottom: 8 }}>{String(i + 1).padStart(2, '0')}</div>
                    <Field label={i === 0 ? 'Container No' : ''}>
                      <Input className="mono" value={c.container_no} onChange={setC(i, 'container_no')} placeholder="TGHU1234567" />
                    </Field>
                    <Field label={i === 0 ? 'Seal No' : ''}>
                      <Input value={c.seal_no} onChange={setC(i, 'seal_no')} placeholder="SL-000000" />
                    </Field>
                    <Field label={i === 0 ? 'Size' : ''}>
                      <Select value={c.size} onChange={setC(i, 'size')}>
                        <option value="20ft">20ft</option>
                        <option value="40ft">40ft</option>
                        <option value="40HC">40HC</option>
                      </Select>
                    </Field>
                    <Button type="button" variant="ghost" size="sm" icon={<IconTrash size={12} />}
                      onClick={() => removeContainer(i)} disabled={containers.length === 1} />
                  </div>
                  {errors[`container_${i}`] && <p className="inp__error">{errors[`container_${i}`]}</p>}
                </div>
              ))}
            </div>
          </Card>

          {mutation.isError && (
            <p className="inp__error">{mutation.error?.response?.data?.error ?? 'Gagal menyimpan.'}</p>
          )}
        </div>

        {/* Sidebar */}
        <aside className="col" style={{ gap: 16, position: 'sticky', top: 16 }}>
          <Card title="Summary" muted>
            <dl className="dl" style={{ gridTemplateColumns: '110px 1fr' }}>
              <dt>Periode</dt><dd>{buku ?? (isEdit ? `Buku #${form.buku_id}` : '—')}</dd>
              <dt>Shipper</dt><dd>{form.shipper || <span className="dim">—</span>}</dd>
              <dt>Commodity</dt><dd>{form.commodity || <span className="dim">—</span>}</dd>
              <dt>Containers</dt><dd>{deriveQty(containers)}</dd>
              <dt>In → Out</dt>
              <dd className={form.in_date ? 'num' : 'dim'} style={{ fontSize: 12 }}>
                {form.in_date ? fmtDate(form.in_date) : '—'} → {form.out_date ? fmtDate(form.out_date) : 'Pending'}
              </dd>
            </dl>
          </Card>
          <Card title="Apa selanjutnya?" muted>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.7 }}>
              <li>Setelah Create, kamu akan diarahkan ke halaman detail booking</li>
              <li>Tambahkan <strong>line items</strong> di section Invoice</li>
              <li>Set <strong>Piutang</strong> dari total invoice atau ketik manual</li>
              <li>Catat <strong>Hutang</strong> ke vendor (trucking, pelabuhan)</li>
              <li>Rekam <strong>pembayaran</strong> ketika masuk</li>
            </ol>
          </Card>
        </aside>
      </div>
    </form>
  );
}
