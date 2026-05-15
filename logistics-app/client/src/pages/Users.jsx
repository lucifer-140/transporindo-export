import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import { Badge, Button, Field, Input, Select, Modal, PageHeader, Card, Empty } from "../components/ui.jsx";
import { IconPlus, IconEdit, IconTrash } from "../components/Icons.jsx";

const EMPTY_FORM = { username: "", password: "", full_name: "", role: "worker" };

function initials(u) {
  return (u.full_name || u.username || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function Users() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "worker", new_password: "" });
  const [editError, setEditError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreate(false); setForm(EMPTY_FORM); setFormError("");
    },
    onError: (e) => setFormError(e.response?.data?.error ?? "Create failed."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/users/${id}`, data),
  });

  const changePassMutation = useMutation({
    mutationFn: ({ id, new_password }) => api.post(`/users/${id}/password`, { new_password }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setDeleteConfirm(null); },
  });

  function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    if (form.password.length < 8) { setFormError("Password min 8 karakter."); return; }
    createMutation.mutate(form);
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditForm({ full_name: u.full_name || "", role: u.role, new_password: "" });
    setEditError("");
  }

  async function handleSaveEdit(id) {
    setEditError("");
    if (editForm.new_password && editForm.new_password.length < 8) { setEditError("Password min 8 karakter."); return; }
    try {
      await updateMutation.mutateAsync({ id, data: { full_name: editForm.full_name, role: editForm.role } });
      if (editForm.new_password) await changePassMutation.mutateAsync({ id, new_password: editForm.new_password });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingId(null);
    } catch (e) {
      setEditError(e.response?.data?.error ?? "Save failed.");
    }
  }

  const isSaving = updateMutation.isPending || changePassMutation.isPending;

  return (
    <>
      <PageHeader
        title="Users"
        meta={`${users.length} akun terdaftar`}
        actions={
          <Button variant="primary" icon={<IconPlus size={14} />} onClick={() => { setShowCreate(true); setFormError(""); }}>
            New User
          </Button>
        }
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat User Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button variant="primary" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create User"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="grid grid-form-2">
            <Field label="Username" required>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </Field>
            <Field label="Full Name">
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </Field>
            <Field label="Password (min 8)" required>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="worker">Worker</option>
                <option value="finance">Finance</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
          </div>
          {formError && <div className="auth__err mt-8">{formError}</div>}
        </form>
      </Modal>

      <Card pad={false}>
        <table className="tbl">
          <thead>
            <tr>
              <th>User</th><th>Username</th><th>Role</th><th>Status</th><th>Dibuat</th><th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6}><Empty title="Memuat…" /></td></tr>}
            {users.map((u) =>
              editingId === u.id ? (
                <tr key={u.id}>
                  <td colSpan={6} style={{ padding: "12px 16px", background: "var(--surface-2)" }}>
                    <div className="grid grid-form-3" style={{ marginBottom: 10 }}>
                      <Field label="Full Name">
                        <Input value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
                      </Field>
                      <Field label="Role">
                        <Select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                          <option value="worker">Worker</option>
                          <option value="finance">Finance</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </Field>
                      <Field label="New Password" hint="Kosongkan untuk tidak ubah">
                        <Input type="password" value={editForm.new_password}
                          onChange={(e) => setEditForm((f) => ({ ...f, new_password: e.target.value }))}
                          placeholder="min 8 karakter" />
                      </Field>
                    </div>
                    {editError && <div className="auth__err mb-8">{editError}</div>}
                    <div className="row" style={{ gap: 6 }}>
                      <Button variant="primary" size="sm" disabled={isSaving} onClick={() => handleSaveEdit(u.id)}>
                        {isSaving ? "Saving…" : "Save"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: "50%", background: "var(--surface-2)",
                        color: "var(--fg)", display: "grid", placeItems: "center",
                        fontWeight: 600, fontSize: 12, flexShrink: 0,
                      }}>
                        {initials(u)}
                      </span>
                      <div><div className="strong">{u.full_name || u.username}</div></div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 13 }}>@{u.username}</td>
                  <td><Badge status={u.role} /></td>
                  <td><Badge status={u.active ? "aktif" : "nonaktif"} /></td>
                  <td className="muted num" style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString("id-ID")}</td>
                  <td>
                    {deleteConfirm === u.id ? (
                      <div className="row" style={{ gap: 4 }}>
                        <span className="muted" style={{ fontSize: 12 }}>Hapus?</span>
                        <Button variant="danger" size="sm" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(u.id)}>Ya</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Tidak</Button>
                      </div>
                    ) : (
                      <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                        <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => startEdit(u)} />
                        <Button variant="ghost" size="sm" icon={<IconTrash size={12} />}
                          onClick={() => setDeleteConfirm(u.id)} style={{ color: "var(--danger)" }} />
                      </div>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
