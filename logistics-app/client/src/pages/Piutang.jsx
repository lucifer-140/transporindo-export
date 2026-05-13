import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';

const STATUS_LABELS = { belum_bayar: 'Belum Bayar', sebagian: 'Sebagian', lunas: 'Lunas' };
const STATUS_COLORS = {
  belum_bayar: 'bg-red-100 text-red-800',
  sebagian: 'bg-yellow-100 text-yellow-800',
  lunas: 'bg-green-100 text-green-800',
};
const IDR = (n) => `Rp ${(n ?? 0).toLocaleString('id-ID')}`;

export default function Piutang() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['piutang-list', { q, page }],
    queryFn: () => api.get('/piutang', { params: { q, page, limit: 20 } }).then(r => r.data),
  });

  const rows = (data?.rows ?? []).filter(r => !status || r.status === status);
  const total = data?.total ?? 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Piutang</h2>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
          placeholder="Cari job no / shipper…"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none"
        >
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
          <div className="text-gray-400 py-12 text-center">Belum ada data piutang.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Job No</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Shipper</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tagihan</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Dibayar</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Sisa</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-blue-50">
                  <td className="px-4 py-2.5">
                    <Link to={`/bookings/${r.booking_id}`} className="text-blue-600 hover:underline font-medium">
                      {r.job_no}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{r.shipper}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{IDR(r.jumlah)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-700">{IDR(r.total_paid)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-red-600">{IDR(r.sisa)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
