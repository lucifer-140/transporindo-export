import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';

const STATUS_LABELS = { belum_bayar: 'Belum Bayar', sebagian: 'Sebagian', lunas: 'Lunas' };
const STATUS_COLORS = {
  belum_bayar: 'bg-red-100 text-red-800',
  sebagian: 'bg-yellow-100 text-yellow-800',
  lunas: 'bg-green-100 text-green-800',
};
const IDR = (n) => `Rp ${(n ?? 0).toLocaleString('id-ID')}`;
const EMPTY_FORM = { pihak: '', jumlah: '', keterangan: '', booking_id: '' };
const EMPTY_PAY = { jumlah: '', tanggal: new Date().toISOString().slice(0, 10), keterangan: '' };

export default function Hutang() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [payForms, setPayForms] = useState({});

  const qk = ['hutang-list', { q, page }];

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => api.get('/hutang', { params: { q, page, limit: 20 } }).then(r => r.data),
  });

  const rows = (data?.rows ?? []).filter(r => !statusFilter || r.status === statusFilter);
  const total = data?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/hutang', body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hutang-list'] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setFormError('');
    },
    onError: (e) => setFormError(e.response?.data?.error ?? 'Gagal menyimpan.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/hutang/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hutang-list'] }),
  });

  const addPayMutation = useMutation({
    mutationFn: ({ id, body }) => api.post(`/hutang/${id}/pembayaran`, body).then(r => r.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['hutang-list'] });
      setPayForms(f => ({ ...f, [id]: null }));
    },
  });

  const deletePayMutation = useMutation({
    mutationFn: ({ hutangId, payId }) => api.delete(`/hutang/${hutangId}/pembayaran/${payId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hutang-list'] }),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const body = {
      pihak: form.pihak,
      jumlah: parseInt(form.jumlah) || 0,
      keterangan: form.keterangan,
      ...(form.booking_id ? { booking_id: parseInt(form.booking_id) } : {}),
    };
    createMutation.mutate(body);
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Hutang</h2>
        <button
          onClick={() => { setShowForm(v => !v); setFormError(''); }}
          className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700"
        >
          {showForm ? 'Batal' : '+ Tambah Hutang'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Pihak (Vendor)</label>
              <input required value={form.pihak} onChange={e => setForm(f => ({ ...f, pihak: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Jumlah (Rp)</label>
              <input type="number" min="0" required value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Keterangan</label>
              <input value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Booking ID (opsional)</label>
              <input type="number" value={form.booking_id} onChange={e => setForm(f => ({ ...f, booking_id: e.target.value }))}
                placeholder="Kosongkan jika standalone"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {formError && <p className="text-red-500 text-sm mb-2">{formError}</p>}
          <button type="submit" disabled={createMutation.isPending}
            className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50">
            Simpan
          </button>
        </form>
      )}

      <div className="flex gap-3 mb-4">
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Cari pihak / keterangan…"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none">
          <option value="">Semua Status</option>
          <option value="belum_bayar">Belum Bayar</option>
          <option value="sebagian">Sebagian</option>
          <option value="lunas">Lunas</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="text-gray-400 py-12 text-center">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-gray-400 py-12 text-center">Belum ada data hutang.</div>
        ) : (
          <div>
            {rows.map(h => (
              <div key={h.id} className="border-b border-gray-100 last:border-0">
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-gray-900">{h.pihak}</span>
                    {h.job_no && (
                      <Link to={`/bookings/${h.booking_id}`} onClick={e => e.stopPropagation()}
                        className="ml-2 text-xs text-blue-600 hover:underline">
                        {h.job_no}
                      </Link>
                    )}
                    {h.keterangan && <span className="ml-2 text-xs text-gray-500">{h.keterangan}</span>}
                  </div>
                  <span className="font-mono text-sm">{IDR(h.jumlah)}</span>
                  <span className="font-mono text-sm text-green-700">{IDR(h.total_paid)}</span>
                  <span className="font-mono text-sm text-red-600">{IDR(h.sisa)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[h.status]}`}>
                    {STATUS_LABELS[h.status]}
                  </span>
                  <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(h.id); }}
                    className="text-xs text-red-400 hover:text-red-600">Hapus</button>
                  <span className="text-gray-400 text-xs">{expanded === h.id ? '▲' : '▼'}</span>
                </div>

                {expanded === h.id && (
                  <div className="px-4 pb-4 bg-gray-50">
                    {h.pembayaran.length > 0 && (
                      <table className="w-full text-sm mb-3">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                            <th className="text-left py-1.5">Tanggal</th>
                            <th className="text-left py-1.5">Keterangan</th>
                            <th className="text-right py-1.5">Jumlah</th>
                            <th className="py-1.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {h.pembayaran.map(p => (
                            <tr key={p.id} className="border-b border-gray-100">
                              <td className="py-1.5 text-gray-600">{p.tanggal}</td>
                              <td className="py-1.5 text-gray-600">{p.keterangan || '—'}</td>
                              <td className="py-1.5 text-right font-mono">{IDR(p.jumlah)}</td>
                              <td className="py-1.5 text-right">
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
                        className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-white">
                        + Tambah Pembayaran
                      </button>
                    )}

                    {payForms[h.id] && (
                      <form onSubmit={e => {
                        e.preventDefault();
                        addPayMutation.mutate({ id: h.id, body: { jumlah: parseInt(payForms[h.id].jumlah) || 0, tanggal: payForms[h.id].tanggal, keterangan: payForms[h.id].keterangan } });
                      }} className="bg-white border border-gray-200 rounded-lg p-3 mt-2">
                        <div className="grid grid-cols-3 gap-3 mb-2">
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
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-white">Batal</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
            <span className="px-3 py-1">Hal. {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={rows.length < 20}
              className="border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
