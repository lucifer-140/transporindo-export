import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import ContainerInputRow from '../components/ContainerInputRow.jsx';

const EMPTY_CONTAINER = () => ({ container_no: '', seal_no: '', size: '20' });

function deriveQty(containers) {
  const counts = {};
  for (const c of containers) if (c.container_no) counts[c.size] = (counts[c.size] ?? 0) + 1;
  return Object.entries(counts).map(([s, n]) => `${n}x${s}`).join(', ') || '—';
}

const FIELDS = [
  ['job_no', 'Job No', true],
  ['shipper', 'Shipper', true],
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
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ job_no: '', shipper: '', peb: '', port: '', feeder: '', vessel_name: '', vessel_no: '', bon: '', in_date: '', out_date: '', trucking: '', notes: '' });
  const [containers, setContainers] = useState([EMPTY_CONTAINER()]);
  const [errors, setErrors] = useState({});

  const { data: existing } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      const b = existing.booking;
      setForm({ job_no: b.job_no, shipper: b.shipper, peb: b.peb ?? '', port: b.port ?? '', feeder: b.feeder ?? '', vessel_name: b.vessel_name ?? '', vessel_no: b.vessel_no ?? '', bon: b.bon ?? '', in_date: b.in_date ?? '', out_date: b.out_date ?? '', trucking: b.trucking ?? '', notes: b.notes ?? '' });
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
    mutation.mutate({ ...form, containers: validContainers });
  }

  function updateContainer(i, val) { setContainers(cs => cs.map((c, idx) => idx === i ? val : c)); }
  function removeContainer(i) { setContainers(cs => cs.filter((_, idx) => idx !== i)); }
  function addContainer() { setContainers(cs => [...cs, EMPTY_CONTAINER()]); }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">←</button>
        <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Booking' : 'New Booking'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(([name, label, required, type = 'text']) => (
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
