import { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';

const STATUS_LABELS = { in_progress: 'In Progress', done: 'Done' };
const STATUS_COLORS = {
  in_progress: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
};

const STATUS_FINANCE_LABELS = { belum_bayar: 'Belum Bayar', sebagian: 'Sebagian', lunas: 'Lunas' };
const STATUS_FINANCE_COLORS = {
  belum_bayar: 'bg-red-100 text-red-800',
  sebagian: 'bg-yellow-100 text-yellow-800',
  lunas: 'bg-green-100 text-green-800',
};
const IDR = (n) => `Rp ${(n ?? 0).toLocaleString('id-ID')}`;

const SHOW_FINANCE = true;

const EMPTY_ITEM = { tipe: '', qty: 1, harga_satuan: '' };

function InvoiceSection({ bookingId }) {
  const queryClient = useQueryClient();
  const qk = ['dokumen', bookingId];
  const [form, setForm] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: qk,
    queryFn: () => api.get(`/bookings/${bookingId}/dokumen`).then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${bookingId}/dokumen`, body).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }) => api.put(`/bookings/${bookingId}/dokumen/${id}`, body).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setForm(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/bookings/${bookingId}/dokumen/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const body = {
      tipe: form.tipe,
      qty: parseInt(form.qty) || 1,
      harga_satuan: parseInt(form.harga_satuan) || 0,
    };
    if (form.id) {
      editMutation.mutate({ id: form.id, body });
    } else {
      addMutation.mutate(body);
      setForm({ ...EMPTY_ITEM });
    }
  }

  const isPending = addMutation.isPending || editMutation.isPending;
  const total = items.reduce((s, d) => s + (d.biaya || 0), 0);

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Invoice <span className="text-gray-400 font-normal">({items.length} item)</span>
        </h3>
        {!form && (
          <button
            onClick={() => setForm({ ...EMPTY_ITEM })}
            className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
          >
            + Tambah Biaya
          </button>
        )}
      </div>

      {items.length === 0 && !form && (
        <p className="text-gray-400 text-sm">Belum ada biaya.</p>
      )}

      {items.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
              <th className="text-left py-1.5 w-8">No.</th>
              <th className="text-left py-1.5">Uraian</th>
              <th className="text-right py-1.5 w-16">Qty</th>
              <th className="text-right py-1.5">Harga Satuan</th>
              <th className="text-right py-1.5">Jumlah</th>
              <th className="py-1.5 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((d, i) => (
              <tr key={d.id} className="border-b border-gray-50">
                <td className="py-1.5 text-gray-400">{i + 1}</td>
                <td className="py-1.5 font-medium">{d.tipe}</td>
                <td className="py-1.5 text-right text-gray-600">{d.qty ?? 1}</td>
                <td className="py-1.5 text-right font-mono text-gray-600">
                  {d.harga_satuan > 0 ? IDR(d.harga_satuan) : '—'}
                </td>
                <td className="py-1.5 text-right font-mono">
                  {d.biaya > 0 ? IDR(d.biaya) : '—'}
                </td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => setForm({ id: d.id, tipe: d.tipe, qty: d.qty ?? 1, harga_satuan: d.harga_satuan ?? 0 })}
                    className="text-xs text-gray-400 hover:text-gray-700 mr-2"
                  >Edit</button>
                  <button
                    onClick={() => deleteMutation.mutate(d.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={4} className="pt-2 text-sm font-semibold text-gray-700 text-right pr-4">Total</td>
              <td className="pt-2 text-right font-mono font-semibold text-gray-900">{IDR(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}

      {form && (
        <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') e.preventDefault(); }} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Uraian</label>
              <input
                required
                value={form.tipe}
                onChange={e => setForm(f => ({ ...f, tipe: e.target.value }))}
                placeholder="Biaya Dokumen, Trucking, Storage…"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Qty</label>
              <input
                type="number"
                min="1"
                required
                value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Harga Satuan (Rp)</label>
              <input
                type="number"
                min="0"
                value={form.harga_satuan}
                onChange={e => setForm(f => ({ ...f, harga_satuan: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-xs text-gray-500">
              Jumlah: <span className="font-mono font-semibold text-gray-800">{IDR((parseInt(form.qty) || 0) * (parseInt(form.harga_satuan) || 0))}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">
              {form.id ? 'Simpan' : 'Tambah'}
            </button>
            <button type="button" onClick={() => setForm(null)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

const EMPTY_PAY = { jumlah: '', tanggal: new Date().toISOString().slice(0, 10), metode: 'transfer', keterangan: '' };
const METODE_OPTIONS = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'giro', label: 'Giro' },
  { value: 'lainnya', label: 'Lainnya' },
];

function PiutangSection({ bookingId }) {
  const queryClient = useQueryClient();
  const qk = ['piutang', bookingId];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ jumlah: '', keterangan: '' });
  const [payForm, setPayForm] = useState(null);

  const { data: piutang } = useQuery({
    queryKey: qk,
    queryFn: () => api.get(`/bookings/${bookingId}/piutang`).then(r => r.data),
  });

  const { data: dokumen = [] } = useQuery({
    queryKey: ['dokumen', bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}/dokumen`).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${bookingId}/piutang`, body).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setEditing(false); },
  });

  const updateMutation = useMutation({
    mutationFn: (body) => api.put(`/bookings/${bookingId}/piutang/${piutang.id}`, body).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setEditing(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/bookings/${bookingId}/piutang/${piutang.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const addPayMutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${bookingId}/piutang/${piutang.id}/pembayaran`, body).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setPayForm(null); },
  });

  const deletePayMutation = useMutation({
    mutationFn: (payId) => api.delete(`/bookings/${bookingId}/piutang/${piutang.id}/pembayaran/${payId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  function autoFill() {
    const total = dokumen.reduce((s, d) => s + (d.biaya || 0), 0);
    setForm(f => ({ ...f, jumlah: total }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const body = { jumlah: parseInt(form.jumlah) || 0, keterangan: form.keterangan };
    piutang ? updateMutation.mutate(body) : createMutation.mutate(body);
  }

  function handlePaySubmit(e) {
    e.preventDefault();
    addPayMutation.mutate({ jumlah: parseInt(payForm.jumlah) || 0, tanggal: payForm.tanggal, metode: payForm.metode, keterangan: payForm.keterangan });
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Piutang
          {piutang && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_FINANCE_COLORS[piutang.status]}`}>
              {STATUS_FINANCE_LABELS[piutang.status]}
            </span>
          )}
        </h3>
        {!editing && !piutang && (
          <button onClick={() => { setForm({ jumlah: '', keterangan: '' }); setEditing(true); }}
            className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
            + Buat Tagihan
          </button>
        )}
        {!editing && piutang && (
          <div className="flex gap-2">
            <button onClick={() => { setForm({ jumlah: piutang.jumlah, keterangan: piutang.keterangan ?? '' }); setEditing(true); }}
              className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
            <button onClick={() => deleteMutation.mutate()} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
          </div>
        )}
      </div>

      {piutang && !editing && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-xs text-gray-500 uppercase tracking-wider block">Tagihan</span><span className="font-mono">{IDR(piutang.jumlah)}</span></div>
            <div><span className="text-xs text-gray-500 uppercase tracking-wider block">Dibayar</span><span className="font-mono text-green-700">{IDR(piutang.total_paid)}</span></div>
            <div><span className="text-xs text-gray-500 uppercase tracking-wider block">Sisa</span><span className="font-mono text-red-600">{IDR(piutang.sisa)}</span></div>
          </div>
          {piutang.keterangan && <p className="text-sm text-gray-600">{piutang.keterangan}</p>}

          {piutang.pembayaran.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="text-left py-1">Tanggal</th>
                  <th className="text-left py-1">Metode</th>
                  <th className="text-left py-1">Keterangan</th>
                  <th className="text-right py-1">Jumlah</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {piutang.pembayaran.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-1 text-gray-600">{p.tanggal}</td>
                    <td className="py-1 text-gray-600 capitalize">{p.metode || 'transfer'}</td>
                    <td className="py-1 text-gray-600">{p.keterangan || '—'}</td>
                    <td className="py-1 text-right font-mono">{IDR(p.jumlah)}</td>
                    <td className="py-1 text-right">
                      <button onClick={() => deletePayMutation.mutate(p.id)} className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!payForm && piutang.status !== 'lunas' && (
            <button onClick={() => setPayForm({ ...EMPTY_PAY })}
              className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
              + Tambah Pembayaran
            </button>
          )}

          {payForm && (
            <form onSubmit={handlePaySubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-4 gap-3 mb-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tanggal</label>
                  <input type="date" required value={payForm.tanggal}
                    onChange={e => setPayForm(f => ({ ...f, tanggal: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jumlah (Rp)</label>
                  <input type="number" min="1" required value={payForm.jumlah}
                    onChange={e => setPayForm(f => ({ ...f, jumlah: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Metode</label>
                  <select value={payForm.metode}
                    onChange={e => setPayForm(f => ({ ...f, metode: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                    {METODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Keterangan</label>
                  <input value={payForm.keterangan}
                    onChange={e => setPayForm(f => ({ ...f, keterangan: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={addPayMutation.isPending}
                  className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">Simpan</button>
                <button type="button" onClick={() => setPayForm(null)}
                  className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">Batal</button>
              </div>
            </form>
          )}
        </div>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jumlah Tagihan (Rp)</label>
              <div className="flex gap-2">
                <input type="number" min="0" required value={form.jumlah}
                  onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                <button type="button" onClick={autoFill}
                  className="text-xs border border-gray-300 rounded px-2 py-1.5 hover:bg-gray-50 whitespace-nowrap">
                  Auto dari Invoice
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Keterangan</label>
              <input value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">
              {piutang ? 'Simpan' : 'Buat'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">Batal</button>
          </div>
        </form>
      )}

      {!piutang && !editing && <p className="text-gray-400 text-sm">Belum ada tagihan.</p>}
    </div>
  );
}

const EMPTY_HUTANG_FORM = { pihak: '', jumlah: '', keterangan: '' };

function HutangSection({ bookingId }) {
  const queryClient = useQueryClient();
  const qk = ['hutang-booking', bookingId];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_HUTANG_FORM });
  const [expanded, setExpanded] = useState(null);
  const [payForms, setPayForms] = useState({});

  const { data: hutangList = [] } = useQuery({
    queryKey: qk,
    queryFn: () => api.get(`/bookings/${bookingId}/hutang`).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/hutang', body).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/hutang/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  const addPayMutation = useMutation({
    mutationFn: ({ id, body }) => api.post(`/hutang/${id}/pembayaran`, body).then(r => r.data),
    onSuccess: (_, { id }) => { queryClient.invalidateQueries({ queryKey: qk }); setPayForms(f => ({ ...f, [id]: null })); },
  });

  const deletePayMutation = useMutation({
    mutationFn: ({ hutangId, payId }) => api.delete(`/hutang/${hutangId}/pembayaran/${payId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  });

  function handleSubmit(e) {
    e.preventDefault();
    createMutation.mutate({ pihak: form.pihak, jumlah: parseInt(form.jumlah) || 0, keterangan: form.keterangan, booking_id: parseInt(bookingId) });
    setForm({ ...EMPTY_HUTANG_FORM });
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Hutang <span className="text-gray-400 font-normal">({hutangList.length})</span>
        </h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
            + Tambah Hutang
          </button>
        )}
      </div>

      {hutangList.length === 0 && !showForm && <p className="text-gray-400 text-sm">Belum ada hutang.</p>}

      {hutangList.length > 0 && (
        <div className="space-y-2 mb-3">
          {hutangList.map(h => (
            <div key={h.id} className="border border-gray-200 rounded-lg">
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === h.id ? null : h.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{h.pihak}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_FINANCE_COLORS[h.status]}`}>
                    {STATUS_FINANCE_LABELS[h.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono">{IDR(h.jumlah)}</span>
                  <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(h.id); }}
                    className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                  <span className="text-gray-400 text-xs">{expanded === h.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === h.id && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-4 text-sm my-2">
                    <div><span className="text-xs text-gray-500 uppercase tracking-wider block">Tagihan</span><span className="font-mono">{IDR(h.jumlah)}</span></div>
                    <div><span className="text-xs text-gray-500 uppercase tracking-wider block">Dibayar</span><span className="font-mono text-green-700">{IDR(h.total_paid)}</span></div>
                    <div><span className="text-xs text-gray-500 uppercase tracking-wider block">Sisa</span><span className="font-mono text-red-600">{IDR(h.sisa)}</span></div>
                  </div>
                  {h.keterangan && <p className="text-sm text-gray-600 mb-2">{h.keterangan}</p>}

                  {h.pembayaran.length > 0 && (
                    <table className="w-full text-sm mb-2">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                          <th className="text-left py-1">Tanggal</th>
                          <th className="text-left py-1">Metode</th>
                          <th className="text-left py-1">Keterangan</th>
                          <th className="text-right py-1">Jumlah</th>
                          <th className="py-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {h.pembayaran.map(p => (
                          <tr key={p.id} className="border-b border-gray-50">
                            <td className="py-1 text-gray-600">{p.tanggal}</td>
                            <td className="py-1 text-gray-600 capitalize">{p.metode || 'transfer'}</td>
                            <td className="py-1 text-gray-600">{p.keterangan || '—'}</td>
                            <td className="py-1 text-right font-mono">{IDR(p.jumlah)}</td>
                            <td className="py-1 text-right">
                              <button onClick={() => deletePayMutation.mutate({ hutangId: h.id, payId: p.id })}
                                className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {!payForms[h.id] && h.status !== 'lunas' && (
                    <button onClick={() => setPayForms(f => ({ ...f, [h.id]: { ...EMPTY_PAY } }))}
                      className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
                      + Tambah Pembayaran
                    </button>
                  )}

                  {payForms[h.id] && (
                    <form onSubmit={e => { e.preventDefault(); addPayMutation.mutate({ id: h.id, body: { jumlah: parseInt(payForms[h.id].jumlah)||0, tanggal: payForms[h.id].tanggal, metode: payForms[h.id].metode, keterangan: payForms[h.id].keterangan } }); }}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
                      <div className="grid grid-cols-4 gap-3 mb-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tanggal</label>
                          <input type="date" required value={payForms[h.id].tanggal}
                            onChange={e => setPayForms(f => ({ ...f, [h.id]: { ...f[h.id], tanggal: e.target.value } }))}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jumlah (Rp)</label>
                          <input type="number" min="1" required value={payForms[h.id].jumlah}
                            onChange={e => setPayForms(f => ({ ...f, [h.id]: { ...f[h.id], jumlah: e.target.value } }))}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Metode</label>
                          <select value={payForms[h.id].metode}
                            onChange={e => setPayForms(f => ({ ...f, [h.id]: { ...f[h.id], metode: e.target.value } }))}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                            {METODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Keterangan</label>
                          <input value={payForms[h.id].keterangan}
                            onChange={e => setPayForms(f => ({ ...f, [h.id]: { ...f[h.id], keterangan: e.target.value } }))}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={addPayMutation.isPending}
                          className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">Simpan</button>
                        <button type="button" onClick={() => setPayForms(f => ({ ...f, [h.id]: null }))}
                          className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">Batal</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') e.preventDefault(); }} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Pihak (Vendor)</label>
              <input required value={form.pihak}
                onChange={e => setForm(f => ({ ...f, pihak: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jumlah (Rp)</label>
              <input type="number" min="0" required value={form.jumlah}
                onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Keterangan</label>
              <input value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">Tambah</button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">Batal</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get(`/bookings/${id}`).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => api.patch(`/bookings/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['booking', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/bookings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      const bukuId = location.state?.buku_id;
      navigate(bukuId ? `/buku/${bukuId}` : '/');
    },
  });

  if (isLoading) return <div className="text-gray-400 py-12 text-center">Loading…</div>;
  if (!data) return <div className="text-red-500 py-12 text-center">Booking not found.</div>;

  const { booking, containers } = data;

  function handleDelete() {
    if (window.confirm(`Delete booking ${booking.job_no}? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  }

  const otherStatus = booking.status === 'in_progress' ? 'done' : 'in_progress';

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { const bukuId = location.state?.buku_id; navigate(bukuId ? `/buku/${bukuId}` : '/'); }} className="text-gray-400 hover:text-gray-600">←</button>
        <h2 className="text-xl font-bold text-gray-800">{booking.job_no}</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[booking.status] ?? booking.status}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => statusMutation.mutate(otherStatus)}
            disabled={statusMutation.isPending}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Mark {STATUS_LABELS[otherStatus]}
          </button>
          <Link to={`/bookings/${id}/edit`} className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">
            Edit
          </Link>
          <button onClick={handleDelete} disabled={deleteMutation.isPending}
            className="border border-red-300 text-red-600 rounded px-3 py-1.5 text-sm hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <dl className="grid grid-cols-3 gap-x-6 gap-y-5">
          <Field label="Job No" value={booking.job_no} />
          <Field label="Shipper" value={booking.shipper} />
          <Field label="PEB" value={booking.peb} />
          <Field label="Port" value={booking.port} />
          <Field label="Feeder" value={booking.feeder} />
          <Field label="Vessel Name" value={booking.vessel_name} />
          <Field label="Vessel No" value={booking.vessel_no} />
          <Field label="BON" value={booking.bon} />
          <Field label="In" value={booking.in_date} />
          <Field label="Out" value={booking.out_date} />
          <Field label="Trucking" value={booking.trucking} />
          <Field label="Created" value={new Date(booking.created_at).toLocaleString()} />
        </dl>

        {booking.notes && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</dt>
            <dd className="text-sm text-gray-900 whitespace-pre-wrap">{booking.notes}</dd>
          </div>
        )}

        {/* Containers */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Containers <span className="text-gray-400 font-normal">({containers.length})</span>
          </h3>
          {containers.length === 0 ? (
            <p className="text-gray-400 text-sm">No containers recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="text-left py-1.5">#</th>
                  <th className="text-left py-1.5">Container No</th>
                  <th className="text-left py-1.5">Seal No</th>
                  <th className="text-left py-1.5">Size</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-400">{i + 1}</td>
                    <td className="py-1.5 font-mono">{c.container_no}</td>
                    <td className="py-1.5">{c.seal_no || '—'}</td>
                    <td className="py-1.5">{c.size}ft</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invoice */}
        <InvoiceSection bookingId={id} />

        {/* Piutang — hidden, pending implementation */}
        {SHOW_FINANCE && <PiutangSection bookingId={id} />}

        {/* Hutang — hidden, pending implementation */}
        {SHOW_FINANCE && <HutangSection bookingId={id} />}
      </div>
    </div>
  );
}
