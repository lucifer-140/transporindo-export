import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBukuList, createBuku, deleteBuku } from '../api/buku.js';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];

function formatPeriode(tahun, bulan) {
  return `${tahun}/${String(bulan).padStart(2, '0')}`;
}

export default function BukuList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tahun: new Date().getFullYear(), bulan: new Date().getMonth() + 1 });
  const [formError, setFormError] = useState('');

  const { data: bukuList = [], isLoading } = useQuery({
    queryKey: ['buku'],
    queryFn: getBukuList,
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: createBuku,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buku'] });
      setShowForm(false);
      setFormError('');
    },
    onError: (e) => setFormError(e.response?.data?.error ?? 'Gagal membuat buku'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBuku,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buku'] }),
    onError: (e) => alert(e.response?.data?.error ?? 'Gagal hapus buku'),
  });

  function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    createMutation.mutate({ tahun: parseInt(form.tahun), bulan: parseInt(form.bulan) });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Buku</h2>
        <button
          onClick={() => { setShowForm(true); setFormError(''); }}
          className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
        >
          + Buku Baru
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-80">
            <h3 className="font-semibold text-gray-800 mb-4">Buat Buku Baru</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                <input
                  type="number" min="2020" max="2099"
                  value={form.tahun}
                  onChange={e => setForm(f => ({ ...f, tahun: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                <select
                  value={form.bulan}
                  onChange={e => setForm(f => ({ ...f, bulan: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{String(i+1).padStart(2,'0')} — {m}</option>)}
                </select>
              </div>
              {formError && <p className="text-red-500 text-xs">{formError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 bg-blue-600 text-white rounded px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {createMutation.isPending ? 'Menyimpan…' : 'Buat'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm hover:bg-gray-50">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-500">Memuat…</div>
      ) : bukuList.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">Belum ada buku. Buat buku baru untuk mulai mencatat booking.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Periode</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Booking</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bukuList.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/buku/${b.id}`)}>
                  <td className="px-4 py-3 font-mono font-medium text-blue-700">{formatPeriode(b.tahun, b.bulan)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${b.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {b.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{b.booking_count}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    {b.booking_count === 0 && (
                      <button
                        onClick={() => { if (confirm(`Hapus buku ${formatPeriode(b.tahun, b.bulan)}?`)) deleteMutation.mutate(b.id); }}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
