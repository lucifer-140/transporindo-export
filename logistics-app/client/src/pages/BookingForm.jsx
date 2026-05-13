import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import ContainerInputRow from '../components/ContainerInputRow.jsx';

const EMPTY_CONTAINER = () => ({ container_no: '', seal_no: '', size: '20' });

function deriveQty(containers) {
  const counts = {};
  for (const c of containers) if (c.container_no) counts[c.size] = (counts[c.size] ?? 0) + 1;
  return Object.entries(counts).map(([s, n]) => `${n}x${s}`).join(', ') || '—';
}

const TEXT_FIELDS = [
  ['peb', 'PEB', false],
  ['port', 'Port', false],
  ['feeder', 'Feeder', false],
  ['vessel_name', 'Vessel Name', false],
  ['vessel_no', 'Vessel No', false],
  ['bon', 'BON', false],
  ['in_date', 'In', false, 'date'],
  ['out_date', 'Out', false, 'date'],
  ['trucking', 'Trucking', false],
];

export default function BookingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const bukuState = location.state ?? {};
  const [form, setForm] = useState({ job_no: '', shipper: '', commodity: '', peb: '', port: '', feeder: '', vessel_name: '', vessel_no: '', bon: '', in_date: '', out_date: '', trucking: '', notes: '', buku_id: bukuState.buku_id ?? '' });
  const [containers, setContainers] = useState([EMPTY_CONTAINER()]);
  const [errors, setErrors] = useState({});

  const { data: existing } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  const { data: shippers = [] } = useQuery({
    queryKey: ['shippers'],
    queryFn: () => api.get('/shippers').then(r => r.data),
  });

  // Commodities for selected shipper
  const selectedShipper = shippers.find(s => s.name === form.shipper);
  const shipperCommodities = selectedShipper?.commodities ?? [];

  // When shipper changes, auto-fill commodity if exactly 1, else clear
  function handleShipperChange(name) {
    const s = shippers.find(sh => sh.name === name);
    const commodities = s?.commodities ?? [];
    setForm(f => ({
      ...f,
      shipper: name,
      commodity: commodities.length === 1 ? commodities[0].name : '',
    }));
  }

  useEffect(() => {
    if (existing) {
      const b = existing.booking;
      setForm({ job_no: b.job_no, shipper: b.shipper, commodity: b.commodity ?? '', peb: b.peb ?? '', port: b.port ?? '', feeder: b.feeder ?? '', vessel_name: b.vessel_name ?? '', vessel_no: b.vessel_no ?? '', bon: b.bon ?? '', in_date: b.in_date ?? '', out_date: b.out_date ?? '', trucking: b.trucking ?? '', notes: b.notes ?? '', buku_id: b.buku_id ?? '' });
      setContainers(existing.containers.length ? existing.containers.map(c => ({ container_no: c.container_no, seal_no: c.seal_no ?? '', size: c.size })) : [EMPTY_CONTAINER()]);
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/bookings/${id}`, data).then(r => r.data)
      : api.post('/bookings', data).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      navigate(`/bookings/${data.booking.id}`);
    },
  });

  function validate() {
    const errs = {};
    if (!isEdit && !form.buku_id) errs.buku_id = 'Required';
    if (!form.job_no.trim()) errs.job_no = 'Required';
    if (!form.shipper.trim()) errs.shipper = 'Required';
    const validContainers = containers.filter(c => c.container_no.trim());
    validContainers.forEach((c, i) => {
      if (!/^[A-Z]{4}[0-9]{7}$/.test(c.container_no)) {
        errs[`container_${i}`] = `Row ${i + 1}: format should be ABCD1234567`;
      }
    });
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const validContainers = containers.filter(c => c.container_no.trim());
    mutation.mutate({ ...form, buku_id: parseInt(form.buku_id), containers: validContainers });
  }

  function updateContainer(i, val) { setContainers(cs => cs.map((c, idx) => idx === i ? val : c)); }
  function removeContainer(i) { setContainers(cs => cs.filter((_, idx) => idx !== i)); }
  function addContainer() { setContainers(cs => [...cs, EMPTY_CONTAINER()]); }

  const selectClass = (hasError) =>
    `w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${hasError ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">←</button>
        <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Booking' : 'New Booking'}</h2>
      </div>

      {mutation.isPending && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-sm font-medium text-gray-700">Menyimpan…</span>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') e.preventDefault(); }}
        className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-5"
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Buku — read-only label on new bookings */}
          {!isEdit && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buku (Periode)</label>
              {bukuState.buku_periode ? (
                <div className="flex items-center gap-2 h-[34px] px-3 border border-gray-200 rounded bg-gray-50 text-sm text-gray-700 font-mono">
                  {bukuState.buku_periode}
                </div>
              ) : (
                <div className="flex items-center gap-2 h-[34px] px-3 border border-red-300 rounded bg-red-50 text-sm text-red-600">
                  Buku tidak dipilih —{' '}
                  <button type="button" onClick={() => navigate('/buku')} className="underline hover:text-red-800">
                    pilih dari halaman Buku
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Job No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job No<span className="text-red-500 ml-0.5">*</span></label>
            <input
              type="text" value={form.job_no} onChange={e => setForm(f => ({ ...f, job_no: e.target.value }))}
              className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.job_no ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.job_no && <p className="text-red-500 text-xs mt-0.5">{errors.job_no}</p>}
          </div>

          {/* Shipper */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipper<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select value={form.shipper} onChange={e => handleShipperChange(e.target.value)}
              className={selectClass(errors.shipper)}>
              <option value="">— Select shipper —</option>
              {shippers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            {errors.shipper && <p className="text-red-500 text-xs mt-0.5">{errors.shipper}</p>}
          </div>

          {/* Commodity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
            {shipperCommodities.length === 1 ? (
              <div className="flex items-center h-[34px] px-3 border border-gray-200 rounded bg-gray-50 text-sm text-gray-600">
                {form.commodity}
              </div>
            ) : (
              <select value={form.commodity} onChange={e => setForm(f => ({ ...f, commodity: e.target.value }))}
                disabled={!form.shipper || shipperCommodities.length === 0}
                className={`${selectClass(false)} disabled:bg-gray-50 disabled:text-gray-400`}>
                <option value="">— Select commodity —</option>
                {shipperCommodities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            )}
          </div>

          {/* Remaining text fields */}
          {TEXT_FIELDS.map(([name, label, required, type = 'text']) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
              <input
                type={type} value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[name] ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors[name] && <p className="text-red-500 text-xs mt-0.5">{errors[name]}</p>}
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Containers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Containers <span className="text-gray-400 font-normal">— Qty: {deriveQty(containers)}</span></label>
          </div>
          <div className="flex flex-col gap-2">
            {containers.map((c, i) => (
              <div key={i}>
                <ContainerInputRow container={c} index={i} onChange={updateContainer} onRemove={removeContainer} />
                {errors[`container_${i}`] && <p className="text-amber-600 text-xs mt-0.5">{errors[`container_${i}`]}</p>}
              </div>
            ))}
          </div>
          <button type="button" onClick={addContainer} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Add Container</button>
        </div>

        {mutation.isError && <p className="text-red-500 text-sm">{mutation.error?.response?.data?.error ?? 'Save failed.'}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mutation.isPending}
            className="bg-blue-600 text-white rounded px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Booking'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="border border-gray-300 rounded px-5 py-2 text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
