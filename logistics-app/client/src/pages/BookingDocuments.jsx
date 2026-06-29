import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { Button, Card, Empty, Field, Input, Select, fmtDate } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconPlus, IconTrash, IconEdit } from '../components/Icons.jsx';

// Tipe EMKL master list (value === label). Free-form on the backend, so this
// list can grow without a schema change.
const DOC_TYPES = [
  'BIAYA LAIN', 'PEB', 'PHYTO', 'FUMIGASI', 'LIFT ON', 'COO', 'LIFT OFF',
  'BIAYA LAPANGAN', 'SERTIFIKAT',
].map(t => ({ value: t, label: t }));

const PAYMENT_TYPES = [
  { value: 'cash',   label: 'Cash' },
  { value: 'credit', label: 'Credit' },
];

const EMPTY = { no_sertifikat: '', tgl_bon: '', keterangan: '', no_job: '', nilai_pembayaran: '', tipe_pembayaran: '' };

function fmtRp(val) {
  if (val === null || val === undefined || val === '') return '—';
  return Number(val).toLocaleString('id-ID');
}

function typeLabelOf(v) {
  return DOC_TYPES.find(t => t.value === v)?.label ?? String(v).toUpperCase();
}
function payLabelOf(v) {
  return PAYMENT_TYPES.find(t => t.value === v)?.label ?? '—';
}

// Shared field set for add/edit forms
function DocFields({ docType, setDocType, fields, set, lockType = false }) {
  return (
    <>
      <Field label="Tipe EMKL" required>
        <Select value={docType} onChange={e => setDocType(e.target.value)} disabled={lockType}>
          <option value="">— Pilih jenis —</option>
          {docType && !DOC_TYPES.some(t => t.value === docType) && <option value={docType}>{docType}</option>}
          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </Field>
      <Field label="No. Sertifikat"><Input value={fields.no_sertifikat} onChange={set('no_sertifikat')} /></Field>
      <Field label="Tgl Bon / Tgl Pelunasan"><Input type="date" value={fields.tgl_bon} onChange={set('tgl_bon')} /></Field>
      <Field label="No. Job"><Input value={fields.no_job} onChange={set('no_job')} /></Field>
      <Field label="Nilai Pembayaran"><Input type="number" min={0} value={fields.nilai_pembayaran} onChange={set('nilai_pembayaran')} placeholder="0" /></Field>
      <Field label="Tipe Pembayaran">
        <Select value={fields.tipe_pembayaran} onChange={set('tipe_pembayaran')}>
          <option value="">—</option>
          {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </Field>
      <Field label="Keterangan" span={2}><Input value={fields.keterangan} onChange={set('keterangan')} /></Field>
    </>
  );
}

function DocRow({ doc, bookingId, onDelete, canEdit }) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [docType, setDocType] = useState(doc.doc_type ?? '');
  const [fields, setFields] = useState({
    no_sertifikat: doc.no_sertifikat ?? '',
    tgl_bon: doc.tgl_bon ?? '',
    keterangan: doc.keterangan ?? '',
    no_job: doc.no_job ?? '',
    nilai_pembayaran: doc.nilai_pembayaran ?? '',
    tipe_pembayaran: doc.tipe_pembayaran ?? '',
  });
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const updateMutation = useMutation({
    mutationFn: (body) => api.put(`/bookings/${bookingId}/documents/${doc.id}`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', bookingId] });
      toast('EMKL diperbarui.');
      setEditing(false);
    },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal memperbarui EMKL.', 'error'),
  });

  function startEdit() {
    setDocType(doc.doc_type ?? '');
    setFields({
      no_sertifikat: doc.no_sertifikat ?? '',
      tgl_bon: doc.tgl_bon ?? '',
      keterangan: doc.keterangan ?? '',
      no_job: doc.no_job ?? '',
      nilai_pembayaran: doc.nilai_pembayaran ?? '',
      tipe_pembayaran: doc.tipe_pembayaran ?? '',
    });
    setEditing(true);
  }

  if (editing) {
    return (
      <tr className="ps-grid__editrow">
        <td colSpan={8}>
          <div className="ps-editpanel">
            <div className="ps-editpanel__hd">Edit EMKL — {typeLabelOf(doc.doc_type)}</div>
            <div className="grid grid-form-2">
              <DocFields docType={docType} setDocType={setDocType} fields={fields} set={set} />
            </div>
            <div className="row" style={{ gap: 6, justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Batal</Button>
              <Button variant="primary" size="sm" disabled={!docType || updateMutation.isPending} onClick={() => updateMutation.mutate({ doc_type: docType, ...fields })}>Simpan</Button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td><span className="doc-type-badge">{typeLabelOf(doc.doc_type)}</span></td>
      <td className={`mono${!doc.no_sertifikat ? ' dim' : ''}`}>{doc.no_sertifikat || '—'}</td>
      <td className={!doc.tgl_bon ? 'dim' : ''}>{doc.tgl_bon ? fmtDate(doc.tgl_bon) : '—'}</td>
      <td className={`mono${!doc.no_job ? ' dim' : ''}`}>{doc.no_job || '—'}</td>
      <td className={`num${doc.nilai_pembayaran == null ? ' dim' : ''}`}>{fmtRp(doc.nilai_pembayaran)}</td>
      <td className={!doc.tipe_pembayaran ? 'dim' : ''}>{doc.tipe_pembayaran ? payLabelOf(doc.tipe_pembayaran) : '—'}</td>
      <td className={!doc.keterangan ? 'dim' : ''}>{doc.keterangan || '—'}</td>
      <td>
        <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
          {canEdit && (
            <>
              <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={startEdit} />
              <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => onDelete(doc.id)} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddDocForm({ bookingId, onDone }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState('');
  const [fields, setFields] = useState(EMPTY);
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (body) => api.post(`/bookings/${bookingId}/documents`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', bookingId] });
      toast('EMKL ditambahkan.');
      onDone();
    },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menambah EMKL.', 'error'),
  });

  return (
    <Card title="Tambah EMKL">
      <div className="grid grid-form-2">
        <DocFields docType={docType} setDocType={setDocType} fields={fields} set={set} />
      </div>
      <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button variant="primary" disabled={!docType || mutation.isPending} onClick={() => mutation.mutate({ doc_type: docType, ...fields })}>
          {mutation.isPending ? 'Menyimpan…' : 'Simpan EMKL'}
        </Button>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['booking-documents', bookingId] }); toast('EMKL dihapus.'); },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menghapus EMKL.', 'error'),
  });

  if (isLoading) return null;

  return (
    <div className="col" style={{ gap: 16 }}>
      {showForm && <AddDocForm bookingId={bookingId} onDone={() => setShowForm(false)} />}

      {docs.length === 0 && !showForm && (
        <Card>
          <Empty
            title="Belum ada EMKL"
            sub="Tambahkan EMKL seperti PEB, Phyto, Fumigasi, COO, Lift On/Off, atau Sertifikat."
            action={canEdit && <Button variant="primary" icon={<IconPlus size={12} />} onClick={() => setShowForm(true)}>Tambah EMKL</Button>}
          />
        </Card>
      )}

      {docs.length > 0 && (
        <Card pad={false}>
          <div className="bd-invoice-bar">
            <div className="bd-invoice-bar__total">
              <span>EMKL</span>
              <b>{docs.length}</b>
            </div>
            {canEdit && !showForm && (
              <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setShowForm(true)}>Tambah EMKL</Button>
            )}
          </div>
          <div className="tbl-wrap">
            <table className="tbl ps-grid" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Tipe</th>
                  <th>No. Sertifikat</th>
                  <th style={{ width: 130 }}>Tgl Bon</th>
                  <th>No. Job</th>
                  <th style={{ width: 130 }}>Nilai</th>
                  <th style={{ width: 90 }}>Pembayaran</th>
                  <th>Keterangan</th>
                  <th style={{ width: 70 }} />
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <DocRow key={doc.id} doc={doc} bookingId={bookingId} canEdit={canEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
