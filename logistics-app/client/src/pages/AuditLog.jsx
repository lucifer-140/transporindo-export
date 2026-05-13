import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
};

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => api.get('/audit', { params: { page, limit: LIMIT } }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Audit Log</h2>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Time', 'User', 'Action', 'Entity', 'ID', 'Changes'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading…</td></tr>}
            {rows.map(row => (
              <tr key={row.id} className="border-b border-gray-100">
                <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(row.timestamp).toLocaleString()}</td>
                <td className="px-4 py-2 font-medium">{row.username ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[row.action] ?? 'bg-gray-100 text-gray-700'}`}>
                    {row.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">{row.entity_type}</td>
                <td className="px-4 py-2 text-gray-500">{row.entity_id ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-gray-500 font-mono max-w-xs truncate">{row.changes ?? '—'}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No audit entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>{total} total entries</span>
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
