import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';

const ROLE_COLORS = {
  admin:   'bg-purple-100 text-purple-800',
  finance: 'bg-blue-100 text-blue-800',
  worker:  'bg-gray-100 text-gray-700',
};

const EMPTY_FORM = { username: '', password: '', full_name: '', role: 'worker' };

export default function Users() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: 'worker', new_password: '' });
  const [showEditPass, setShowEditPass] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setFormError('');
    },
    onError: (e) => setFormError(e.response?.data?.error ?? 'Create failed.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/users/${id}`, data),
  });

  const changePassMutation = useMutation({
    mutationFn: ({ id, new_password }) => api.post(`/users/${id}/password`, { new_password }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirm(null);
    },
  });

  function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    if (form.password.length < 8) { setFormError('Password must be ≥ 8 characters.'); return; }
    createMutation.mutate(form);
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditForm({ full_name: u.full_name || '', role: u.role, new_password: '' });
    setShowEditPass(false);
    setEditError('');
  }

  async function handleSaveEdit(id) {
    setEditError('');
    if (editForm.new_password && editForm.new_password.length < 8) {
      setEditError('Password must be ≥ 8 characters.');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data: { full_name: editForm.full_name, role: editForm.role } });
      if (editForm.new_password) {
        await changePassMutation.mutateAsync({ id, new_password: editForm.new_password });
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingId(null);
    } catch (e) {
      setEditError(e.response?.data?.error ?? 'Save failed.');
    }
  }

  const isSaving = updateMutation.isPending || changePassMutation.isPending;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Users</h2>
        <button onClick={() => { setShowCreate(v => !v); setFormError(''); }}
          className="bg-blue-600 text-white text-sm rounded px-3 py-1.5 hover:bg-blue-700">
          {showCreate ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-5 mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password (min 8)</label>
            <div className="relative">
              <input type={showCreatePass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16" />
              <button type="button" onClick={() => setShowCreatePass(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                {showCreatePass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
              <option value="worker">Worker</option>
              <option value="finance">Finance</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {formError && <p className="col-span-2 text-red-500 text-sm">{formError}</p>}
          <div className="col-span-2">
            <button type="submit" disabled={createMutation.isPending}
              className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-60">
              {createMutation.isPending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Username', 'Full Name', 'Role', 'Created', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading…</td></tr>}
            {users.map(u => (
              editingId === u.id ? (
                <tr key={u.id} className="border-b border-blue-100 bg-blue-50">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">Full Name</label>
                        <input value={editForm.full_name}
                          onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">Role</label>
                        <select value={editForm.role}
                          onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                          <option value="worker">Worker</option>
                          <option value="finance">Finance</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">New Password <span className="text-gray-400">(leave blank to keep)</span></label>
                        <div className="relative">
                          <input type={showEditPass ? 'text' : 'password'} value={editForm.new_password}
                            onChange={e => setEditForm(f => ({ ...f, new_password: e.target.value }))}
                            placeholder="min 8 characters"
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 pr-14" />
                          <button type="button" onClick={() => setShowEditPass(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                            {showEditPass ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                    </div>
                    {editError && <p className="text-red-500 text-xs mb-2">{editError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(u.id)} disabled={isSaving}
                        className="text-xs bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 disabled:opacity-60">
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 border border-gray-200 rounded px-3 py-1 hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium">{u.username}</td>
                  <td className="px-4 py-2.5">{u.full_name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role] ?? ROLE_COLORS.worker}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">
                    {deleteConfirm === u.id ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button onClick={() => deleteMutation.mutate(u.id)} disabled={deleteMutation.isPending}
                          className="text-xs bg-red-600 text-white rounded px-2 py-0.5 hover:bg-red-700 disabled:opacity-60">
                          Yes
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50">
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(u)}
                          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-0.5">
                          Edit
                        </button>
                        <button onClick={() => setDeleteConfirm(u.id)}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-0.5">
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
