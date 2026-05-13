import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const STATUS_LABELS = { in_progress: 'In Progress', done: 'Done' };
const STATUS_COLORS = {
  in_progress: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
};

export default function BookingsList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', { q, status, from, to, page }],
    queryFn: () => api.get('/bookings', { params: { q, status, from, to, page, limit: LIMIT } }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  function handleExport() {
    const params = new URLSearchParams({ from, to });
    window.location.href = `/api/bookings/export?${params}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Bookings</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">
            Export CSV
          </button>
          <Link to="/bookings/new" className="bg-blue-600 text-white text-sm rounded px-3 py-1.5 hover:bg-blue-700">
            + New Booking
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text" placeholder="Search job, shipper, container, vessel…"
          value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none" />
        {(q || status || from || to) && (
          <button onClick={() => { setQ(''); setStatus(''); setFrom(''); setTo(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Job No', 'Shipper', 'Qty', 'Port', 'Feeder', 'Vessel', 'Container', 'Status', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No bookings found.</td></tr>
            )}
            {rows.map(row => (
              <tr key={row.id}
                onClick={() => navigate(`/bookings/${row.id}`)}
                className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
              >
                <td className="px-4 py-2.5 font-medium text-blue-700">{row.job_no}</td>
                <td className="px-4 py-2.5">{row.shipper}</td>
                <td className="px-4 py-2.5 text-gray-600">{row.qty}</td>
                <td className="px-4 py-2.5">{row.port}</td>
                <td className="px-4 py-2.5">{row.feeder}</td>
                <td className="px-4 py-2.5">{row.vessel_name} {row.vessel_no}</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {row.first_container}
                  {row.extra_containers > 0 && <span className="text-gray-400"> +{row.extra_containers}</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(row.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="px-3 py-1">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
