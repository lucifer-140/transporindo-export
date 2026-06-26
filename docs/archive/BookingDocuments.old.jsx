import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { Button, Card, Empty, Field, Input, Select, fmtDate } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconPlus, IconTrash, IconEdit } from '../components/Icons.jsx';

const DOC_TYPES = [
  { value: 'phyto',       label: 'Phyto' },
  { value: 'peb',         label: 'PEB' },
  { value: 'coo',         label: 'COO' },
  { value: 'ico',         label: 'ICO' },
  { value: 'kadin',       label: 'Kadin' },
  { value: 'certificate', label: 'Certificate' },
];

const UNIFIED_FIELDS = [
  { key: 'no_dok',  label: 'No. Dok',  type: 'text' },
  { key: 'tgl_dok', label: 'Tgl. Dok', type: 'date' },
  { key: 'no_si',   label: 'No. SI',   type: 'text' },
  { key: 'no_inv',  label: 'No. INV',  type: 'text' },
];

function fmtRp(val) {
  if (!val && val !== 0) return '—';
  return Number(val).toLocaleString('id-ID');
}

function DocRow({ doc, bookingId, onDelete, canEdit, isFinance, payment }) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const typeLabel = DOC_TYPES.find(t => t.value === doc.doc_type)?.label ?? doc.doc_type.toUpperCase();

  const [fields, setFields] = useState({ no_dok: doc.no_dok ?? '', tgl_dok: doc.tgl_dok ?? '', no_si: doc.no_si ?? '', no_inv: doc.no_inv ?? '' });
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

  if (editing) {
    return (
      <div className="doc-table__row is-editing" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span className="doc-type-badge" style={{ flexShrink: 0 }}>{typeLabel}</span>
        {UNIFIED_FIELDS.map(({ key, label, type }) => (
          <Field key={key} label={label} style={{ flex: '1 1 120px', margin: 0 }}>
            <Input type={type === 'date' ? 'date' : 'text'} value={fields[key]} onChange={set(key)} />
          </Field>
        ))}
        <div className="row" style={{ gap: 4, marginLeft: 'auto' }}>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Batal</Button>
          <Button variant="primary" size="sm" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate(fields)}>
            Simpan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`doc-table__row${isFinance ? ' is-finance' : ''}`}>
      <div><span className="doc-type-badge">{typeLabel}</span></div>
      <div className={`doc-table__cell mono${!doc.no_dok ? ' dim' : ''}`}>{doc.no_dok || '—'}</div>
      <div className={`doc-table__cell${!doc.tgl_dok ? ' dim' : ''}`}>{doc.tgl_dok ? fmtDate(doc.tgl_dok) : '—'}</div>
      <div className={`doc-table__cell mono${!doc.no_si ? ' dim' : ''}`}>{doc.no_si || '—'}</div>
      <div className={`doc-table__cell mono${!doc.no_inv ? ' dim' : ''}`}>{doc.no_inv || '—'}</div>
      {payment !== undefined && (
        <>
          <div className={`doc-table__cell mono${!payment?.no_voucher ? ' dim' : ''}`}>{payment?.no_voucher || '—'}</div>
          <div className={`doc-table__cell${!payment?.keterangan ? ' dim' : ''}`}>{payment?.keterangan || '—'}</div>
          <div className={`doc-table__cell${!payment?.tgl_pelunasan ? ' dim' : ''}`}>{payment?.tgl_pelunasan ? fmtDate(payment.tgl_pelunasan) : '—'}</div>
          <div className={`doc-table__cell${!payment?.nilai_pembayaran ? ' dim' : ''}`}>{fmtRp(payment?.nilai_pembayaran)}</div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {canEdit && (
          <>
            <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={() => { setFields({ no_dok: doc.no_dok ?? '', tgl_dok: doc.tgl_dok ?? '', no_si: doc.no_si ?? '', no_inv: doc.no_inv ?? '' }); setEditing(true); }} />
            <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={() => onDelete(doc.id)} />
          </>
        )}
      </div>
    </div>
  );
}

function AddDocForm({ bookingId, onDone }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState('');
  const [fields, setFields] = useState({ no_dok: '', tgl_dok: '', no_si: '', no_inv: '' });
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

  return (
    <Card title="Tambah Dokumen">
      <div className="col" style={{ gap: 14 }}>
        <Field label="Jenis Dokumen" required>
          <Select value={docType} onChange={e => setDocType(e.target.value)}>
            <option value="">— Pilih jenis —</option>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        {docType && (
          <div className="grid grid-form-2">
            {UNIFIED_FIELDS.map(({ key, label, type }) => (
              <Field key={key} label={label}>
                <Input type={type === 'date' ? 'date' : 'text'} value={fields[key]} onChange={set(key)} />
              </Field>
            ))}
          </div>
        )}
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onDone}>Batal</Button>
          <Button variant="primary" disabled={!docType || mutation.isPending} onClick={() => mutation.mutate({ doc_type: docType, ...fields })}>
            {mutation.isPending ? 'Menyimpan…' : 'Simpan Dokumen'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function BookingDocuments({ bookingId, canEdit = true, isFinance = false }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['booking-documents', bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}/documents`).then(r => r.data),
  });

  const { data: hutangList = [] } = useQuery({
    queryKey: ['booking-hutang-dokumen', bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}/hutang-dokumen`).then(r => r.data),
    enabled: isFinance,
  });

  // map booking_document_id → first hutang entry (one payment per doc shown inline)
  const paymentByDoc = {};
  hutangList.forEach(h => { if (!paymentByDoc[h.booking_document_id]) paymentByDoc[h.booking_document_id] = h; });

  const deleteMutation = useMutation({
    mutationFn: (docId) => api.delete(`/bookings/${bookingId}/documents/${docId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['booking-documents', bookingId] }); toast('Dokumen dihapus.'); },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menghapus dokumen.', 'error'),
  });

  if (isLoading) return null;

  return (
    <div className="col" style={{ gap: 16 }}>
      {showForm && <AddDocForm bookingId={bookingId} onDone={() => setShowForm(false)} />}

      {docs.length === 0 && !showForm && (
        <Card>
          <Empty
            title="Belum ada dokumen"
            sub="Tambahkan dokumen seperti Phyto, PEB, COO, ICO, Kadin, atau Certificate."
            action={canEdit && <Button variant="primary" icon={<IconPlus size={12} />} onClick={() => setShowForm(true)}>Tambah Dokumen</Button>}
          />
        </Card>
      )}

      {docs.length > 0 && (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>{docs.length} Dokumen</h3>
            {canEdit && !showForm && (
              <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setShowForm(true)}>
                Tambah Dokumen
              </Button>
            )}
          </div>

          <div className="doc-table">
            <div className={`doc-table__hdr${isFinance ? ' is-finance' : ''}`}>
              <span>Jenis</span>
              <span>No. Dok</span>
              <span>Tgl. Dok</span>
              <span>No. SI</span>
              <span>No. INV</span>
              {isFinance && <><span>No. Voucher</span><span>Keterangan</span><span>Tgl. Pelunasan</span><span>Nilai Pembayaran</span></>}
              <span />
            </div>
            {docs.map(doc => (
              <DocRow
                key={doc.id}
                doc={doc}
                bookingId={bookingId}
                canEdit={canEdit}
                isFinance={isFinance}
                onDelete={(id) => deleteMutation.mutate(id)}
                payment={isFinance ? (paymentByDoc[doc.id] ?? null) : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
