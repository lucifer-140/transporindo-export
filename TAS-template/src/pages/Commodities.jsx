import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';

export default function Commodities() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['commodities'],
    queryFn: () => api.get('/commodities').then(r => r.data),
  });

  const add = useMutation({
    mutationFn: (name) => api.post('/commodities', { name }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commodities'] }); setName(''); setError(''); },
    onError: (e) => setError(e.response?.data?.error ?? 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/commodities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commodities'] }),
  });

  function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    add.mutate(name.trim());
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Commodities</h2>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          value={name} onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="Commodity name (e.g. Furniture)"
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" disabled={add.isPending}
          className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          Add
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-400">No commodities yet.</p>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {data.map(c => (
            <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-gray-800">{c.name}</span>
              <button onClick={() => remove.mutate(c.id)}
                className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
