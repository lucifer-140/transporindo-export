import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { Button, Card, Empty, Field, Input, Select, fmtDate } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconPlus, IconTrash, IconEdit } from '../components/Icons.jsx';

const DOC_TYPES = [
  { value: 'peb',   label: 'PEB' },
  { value: 'phyto', label: 'Phyto' },
];

const FIELD_DEFS = {
  peb: [
    { key: 'no_peb',          label: 'No. PEB',           type: 'text' },
    { key: 'no_si',           label: 'No. SI',            type: 'text' },
    { key: 'no_inv',          label: 'No. INV',           type: 'text' },
    { key: 'tgl',             label: 'Tgl',               type: 'date' },
    { key: 'no_pelunasan',    label: 'No. Pelunasan',     type: 'text' },
    { key: 'nilai_pelunasan', label: 'Nilai Pelunasan',   type: 'number' },
    { key: 'tgl_pelunasan',   label: 'Tgl Pelunasan',     type: 'date' },
  ],
  phyto: [
    { key: 'no_phyto',        label: 'No. Phyto',         type: 'text' },
    { key: 'no_pelunasan',    label: 'No. Pelunasan',     type: 'text' },
    { key: 'nilai_pelunasan', label: 'Nilai Pelunasan',   type: 'number' },
    { key: 'tgl_pelunasan',   label: 'Tgl Pelunasan',     type: 'date' },
  ],
};

const PRIMARY_KEY = { peb: 'no_peb', phyto: 'no_phyto' };

function fmtVal(val, type) {
  if (val == null || val === '') return '—';
  if (type === 'date') return fmtDate(val);
  if (type === 'number') return Number(val).toLocaleString('id-ID');
  return val;
}

function DocRow({ doc, bookingId, onDelete, canDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const typeLabel = DOC_TYPES.find(t => t.value === doc.doc_type)?.label ?? doc.doc_type.toUpperCase();
  const primaryKey = PRIMARY_KEY[doc.doc_type];
  const primaryVal = doc[primaryKey];
  const defs = FIELD_DEFS[doc.doc_type] ?? [];

  const [fields, setFields] = useState(() => {
    const f = {};
    defs.forEach(({ key }) => { f[key] = doc[key] ?? ''; });
    return f;
  });

  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const updateMutation = useMutation({
    mutationFn: (body) => api.put(`/bookings/${bookingId}/documents/${doc.id}`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', bookingId] });
      toast('Dokumen diperbarui.');
      setEditing(false);
    },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal memperbarui dokumen.', 'error'),
  });

  function handleSave() {
    updateMutation.mutate(fields);
  }

  function handleEditClick(e) {
    e.stopPropagation();
    setFields(() => {
      const f = {};
      defs.forEach(({ key }) => { f[key] = doc[key] ?? ''; });
      return f;
    });
    setEditing(true);
    setExpanded(true);
  }

  return (
    <>
      <div
        className={`doc-table__row${expanded ? ' is-expanded' : ''}`}
        onClick={() => { if (!editing) setExpanded(e => !e); }}
        style={{ cursor: editing ? 'default' : 'pointer' }}
      >
        <div><span className="doc-type-badge">{typeLabel}</span></div>
        <div className={`doc-table__cell mono${!primaryVal ? ' dim' : ''}`}>{primaryVal || '—'}</div>
        <div className={`doc-table__cell mono${!doc.no_pelunasan ? ' dim' : ''}`}>{doc.no_pelunasan || '—'}</div>
        <div className={`doc-table__cell${!doc.tgl_pelunasan ? ' dim' : ''}`}>{fmtVal(doc.tgl_pelunasan, 'date')}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }} onClick={e => e.stopPropagation()}>
          {canDelete && (
            <>
              <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={handleEditClick} />
              <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => onDelete(doc.id)} />
            </>
          )}
        </div>
      </div>

      {expanded && !editing && (
        <div className="doc-table__detail">
          <div className="kv-grid">
            {defs.map(({ key, label, type }) => (
              <div className="kv-grid__item" key={key}>
                <div className="kv-grid__lbl">{label}</div>
                <div className={`kv-grid__val${!doc[key] ? ' dim' : type === 'text' ? ' mono' : ''}`}>
                  {fmtVal(doc[key], type)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg-4)' }}>
            Ditambahkan {fmtDate(doc.created_at)}
          </div>
        </div>
      )}

      {expanded && editing && (
        <div className="doc-table__detail">
          <div className="grid grid-form-2" style={{ marginBottom: 14 }}>
            {defs.map(({ key, label, type }) => (
              <Field key={key} label={label}>
                <Input
                  type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                  min={type === 'number' ? 0 : undefined}
                  value={fields[key] ?? ''}
                  onChange={set(key)}
                />
              </Field>
            ))}
          </div>
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setEditing(false); }}>Batal</Button>
            <Button variant="primary" disabled={updateMutation.isPending} onClick={handleSave}>
              {updateMutation.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function AddDocForm({ bookingId, onDone }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState('');
  const [fields, setFields] = useState({});

  const defs = docType ? (FIELD_DEFS[docType] ?? []) : [];
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${bookingId}/documents`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', bookingId] });
      toast('Dokumen ditambahkan.');
      onDone();
    },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menambah dokumen.', 'error'),
  });

  function handleSubmit() {
    if (!docType) return;
    mutation.mutate({ doc_type: docType, ...fields });
  }

  return (
    <Card title="Tambah Dokumen">
      <div className="col" style={{ gap: 14 }}>
        <Field label="Jenis Dokumen" required>
          <Select value={docType} onChange={e => { setDocType(e.target.value); setFields({}); }}>
            <option value="">— Pilih jenis —</option>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>

        {defs.length > 0 && (
          <div className="grid grid-form-2">
            {defs.map(({ key, label, type }) => (
              <Field key={key} label={label}>
                <Input
                  type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                  min={type === 'number' ? 0 : undefined}
                  value={fields[key] ?? ''}
                  onChange={set(key)}
                />
              </Field>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onDone}>Batal</Button>
          <Button variant="primary" disabled={!docType || mutation.isPending} onClick={handleSubmit}>
            {mutation.isPending ? 'Menyimpan…' : 'Simpan Dokumen'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function BookingDocuments({ bookingId, canEdit = true }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['booking-documents', bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}/documents`).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId) => api.delete(`/bookings/${bookingId}/documents/${docId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['booking-documents', bookingId] }); toast('Dokumen dihapus.'); },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menghapus dokumen.', 'error'),
  });

  if (isLoading) return null;

  return (
    <div className="col" style={{ gap: 16 }}>
      {showForm && (
        <AddDocForm bookingId={bookingId} onDone={() => setShowForm(false)} />
      )}

      {docs.length === 0 && !showForm && (
        <Card>
          <Empty
            title="Belum ada dokumen"
            sub="Tambahkan dokumen seperti PEB atau Phyto untuk booking ini."
            action={canEdit && <Button variant="primary" icon={<IconPlus size={12} />} onClick={() => setShowForm(true)}>Tambah Dokumen</Button>}
          />
        </Card>
      )}

      {docs.length > 0 && (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>
              {docs.length} Dokumen
            </h3>
            {canEdit && !showForm && (
              <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setShowForm(true)}>
                Tambah Dokumen
              </Button>
            )}
          </div>

          <div className="doc-table">
            <div className="doc-table__hdr">
              <span>Jenis</span>
              <span>No. Dokumen</span>
              <span>No. Pelunasan</span>
              <span>Tgl Pelunasan</span>
              <span />
            </div>
            {docs.map(doc => (
              <DocRow
                key={doc.id}
                doc={doc}
                bookingId={bookingId}
                canDelete={canEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: 0 }}>Klik baris untuk lihat detail lengkap.</p>
        </>
      )}
    </div>
  );
}
