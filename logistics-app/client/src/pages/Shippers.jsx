import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';

function CommodityList({ shipper }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const add = useMutation({
    mutationFn: (name) => api.post(`/shippers/${shipper.id}/commodities`, { name }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shippers'] }); setName(''); setError(''); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/commodities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shippers'] }),
  });

  function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    add.mutate(name.trim());
  }

  return (
    <div className="mt-2 pl-4 border-l-2 border-gray-100">
      {shipper.commodities.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">No commodities yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2 mb-2">
          {shipper.commodities.map(c => (
            <li key={c.id} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5 text-xs text-gray-700">
              {c.name}
              <button onClick={() => remove.mutate(c.id)} className="text-gray-400 hover:text-red-500 ml-1">×</button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex gap-2 items-center">
        <input
          value={name} onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="Add commodity…"
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
        />
        <button type="submit" disabled={add.isPending}
          className="text-xs bg-gray-200 hover:bg-gray-300 rounded px-2 py-1 disabled:opacity-60">
          Add
        </button>
        {error && <span className="text-red-500 text-xs">{error}</span>}
      </form>
    </div>
  );
}

export default function Shippers() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

  const { data = [], isLoading } = useQuery({
    queryKey: ['shippers'],
    queryFn: () => api.get('/shippers').then(r => r.data),
  });

  const add = useMutation({
    mutationFn: (name) => api.post('/shippers', { name }).then(r => r.data),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['shippers'] });
      setName('');
      setError('');
      setExpanded(prev => ({ ...prev, [s.id]: true }));
    },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/shippers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shippers'] }),
  });

  function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    add.mutate(name.trim());
  }

  function toggle(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Shippers & Commodities</h2>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          value={name} onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="New shipper name (e.g. PT. Metropole)"
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" disabled={add.isPending}
          className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          Add Shipper
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-400">No shippers yet.</p>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {data.map(s => (
            <li key={s.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <button onClick={() => toggle(s.id)} className="flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-blue-600">
                  <span>{expanded[s.id] ? '▾' : '▸'}</span>
                  {s.name}
                  <span className="text-xs font-normal text-gray-400">{s.commodities.length} commodity{s.commodities.length !== 1 ? 's' : ''}</span>
                </button>
                <button onClick={() => remove.mutate(s.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              {expanded[s.id] && <CommodityList shipper={s} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
