import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { Button, Card, Empty, Field, Input, fmtDate } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconEdit, IconTrash, IconPlus } from '../components/Icons.jsx';

const DOC_TYPE_LABELS = {
  phyto: 'Phyto', peb: 'PEB', coo: 'COO', ico: 'ICO', kadin: 'Kadin', certificate: 'Certificate',
};

function fmtRp(val) {
  if (!val && val !== 0) return '—';
  return 'Rp ' + Number(val).toLocaleString('id-ID');
}

function PaymentRow({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [fields, setFields] = useState({
    keterangan: entry.keterangan ?? '',
    no_voucher: entry.no_voucher ?? '',
    tgl_pelunasan: entry.tgl_pelunasan ?? '',
    nilai_pembayaran: entry.nilai_pembayaran ?? '',
    tgl_pembayaran: entry.tgl_pembayaran ?? '',
  });

  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const updateMutation = useMutation({
    mutationFn: (body) => api.put(`/hutang-dokumen/${entry.id}`, body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hutang-dokumen'] });
      toast('Pembayaran diperbarui.');
      setEditing(false);
    },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal memperbarui.', 'error'),
  });

  return (
    <>
      <div
        className={`doc-table__row${expanded ? ' is-expanded' : ''}`}
        onClick={() => { if (!editing) setExpanded(v => !v); }}
        style={{ cursor: editing ? 'default' : 'pointer' }}
      >
        <div className="doc-table__cell mono">{entry.no_voucher || '—'}</div>
        <div className="doc-table__cell">{entry.keterangan || '—'}</div>
        <div className="doc-table__cell">{entry.tgl_pelunasan ? fmtDate(entry.tgl_pelunasan) : '—'}</div>
        <div className="doc-table__cell">{fmtRp(entry.nilai_pembayaran)}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }} onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="sm" icon={<IconEdit size={12} />} onClick={(e) => { e.stopPropagation(); setEditing(true); setExpanded(true); }} />
          <Button variant="ghost" size="sm" icon={<IconTrash size={12} />} onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }} />
        </div>
      </div>

      {expanded && editing && (
        <div className="doc-table__detail">
          <div className="grid grid-form-2" style={{ marginBottom: 14 }}>
            <Field label="Keterangan"><Input value={fields.keterangan} onChange={set('keterangan')} /></Field>
            <Field label="No. Voucher"><Input value={fields.no_voucher} onChange={set('no_voucher')} /></Field>
            <Field label="Tgl. Pelunasan"><Input type="date" value={fields.tgl_pelunasan} onChange={set('tgl_pelunasan')} /></Field>
            <Field label="Nilai Pembayaran"><Input type="number" min={0} value={fields.nilai_pembayaran} onChange={set('nilai_pembayaran')} /></Field>
            <Field label="Tgl. Pembayaran"><Input type="date" value={fields.tgl_pembayaran} onChange={set('tgl_pembayaran')} /></Field>
          </div>
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setEditing(false)}>Batal</Button>
            <Button variant="primary" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate(fields)}>
              {updateMutation.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      )}

      {expanded && !editing && (
        <div className="doc-table__detail">
          <div className="kv-grid">
            <div className="kv-grid__item"><div className="kv-grid__lbl">Keterangan</div><div className="kv-grid__val">{entry.keterangan || '—'}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">No. Voucher</div><div className="kv-grid__val mono">{entry.no_voucher || '—'}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Tgl. Pelunasan</div><div className="kv-grid__val">{entry.tgl_pelunasan ? fmtDate(entry.tgl_pelunasan) : '—'}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Nilai Pembayaran</div><div className="kv-grid__val">{fmtRp(entry.nilai_pembayaran)}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Tgl. Pembayaran</div><div className="kv-grid__val">{entry.tgl_pembayaran ? fmtDate(entry.tgl_pembayaran) : '—'}</div></div>
          </div>
        </div>
      )}
    </>
  );
}

function AddPaymentForm({ docId, onDone }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState({ keterangan: '', no_voucher: '', tgl_pelunasan: '', nilai_pembayaran: '', tgl_pembayaran: '' });
  const set = (k) => (e) => setFields(f => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (body) => api.post('/hutang-dokumen', body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hutang-dokumen'] });
      toast('Pembayaran ditambahkan.');
      onDone();
    },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menambah.', 'error'),
  });

  return (
    <div className="doc-table__detail" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="grid grid-form-2" style={{ marginBottom: 14 }}>
        <Field label="Keterangan"><Input value={fields.keterangan} onChange={set('keterangan')} /></Field>
        <Field label="No. Voucher"><Input value={fields.no_voucher} onChange={set('no_voucher')} /></Field>
        <Field label="Tgl. Pelunasan"><Input type="date" value={fields.tgl_pelunasan} onChange={set('tgl_pelunasan')} /></Field>
        <Field label="Nilai Pembayaran"><Input type="number" min={0} value={fields.nilai_pembayaran} onChange={set('nilai_pembayaran')} /></Field>
        <Field label="Tgl. Pembayaran"><Input type="date" value={fields.tgl_pembayaran} onChange={set('tgl_pembayaran')} /></Field>
      </div>
      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button variant="primary" disabled={mutation.isPending} onClick={() => mutation.mutate({ booking_document_id: docId, ...fields })}>
          {mutation.isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </div>
  );
}

function DocCard({ doc, payments }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const typeLabel = DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type.toUpperCase();

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/hutang-dokumen/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hutang-dokumen'] }); toast('Pembayaran dihapus.'); },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menghapus.', 'error'),
  });

  return (
    <Card>
      <div className="col" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="doc-type-badge">{typeLabel}</span>
            <span className="mono" style={{ fontSize: 13 }}>{doc.no_dok || '—'}</span>
            {doc.tgl_dok && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fmtDate(doc.tgl_dok)}</span>}
            {doc.no_si && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>SI: {doc.no_si}</span>}
            {doc.no_inv && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>INV: {doc.no_inv}</span>}
          </div>
          <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setShowForm(true)}>
            Tambah Pembayaran
          </Button>
        </div>

        {payments.length > 0 && (
          <div className="doc-table">
            <div className="doc-table__hdr">
              <span>No. Voucher</span>
              <span>Keterangan</span>
              <span>Tgl. Pelunasan</span>
              <span>Nilai Pembayaran</span>
              <span />
            </div>
            {payments.map(p => (
              <PaymentRow key={p.id} entry={p} onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
          </div>
        )}

        {payments.length === 0 && !showForm && (
          <p style={{ fontSize: 12, color: 'var(--fg-4)', margin: 0 }}>Belum ada pembayaran untuk dokumen ini.</p>
        )}

        {showForm && <AddPaymentForm docId={doc.id} onDone={() => setShowForm(false)} />}
      </div>
    </Card>
  );
}

export default function HutangDokumen() {
  const [jobInput, setJobInput] = useState('');
  const [searchJob, setSearchJob] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['hutang-dokumen', searchJob],
    queryFn: () => api.get('/hutang-dokumen', { params: { job: searchJob } }).then(r => r.data),
    enabled: !!searchJob,
    retry: false,
  });

  function handleSearch(e) {
    e.preventDefault();
    setSearchJob(jobInput.trim());
  }

  const paymentsByDoc = {};
  if (data?.hutang) {
    data.hutang.forEach(h => {
      if (!paymentsByDoc[h.booking_document_id]) paymentsByDoc[h.booking_document_id] = [];
      paymentsByDoc[h.booking_document_id].push(h);
    });
  }

  return (
    <div className="col" style={{ gap: 20, maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Hutang Dokumen</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0' }}>Cari booking berdasarkan No. Job untuk input pembayaran dokumen.</p>
      </div>

      <Card>
        <form className="row" style={{ gap: 10, alignItems: 'flex-end' }} onSubmit={handleSearch}>
          <Field label="No. Job" style={{ flex: 1 }}>
            <Input
              value={jobInput}
              onChange={e => setJobInput(e.target.value)}
              placeholder="Contoh: JOB-001"
            />
          </Field>
          <Button type="submit" variant="primary" disabled={!jobInput.trim() || isLoading}>
            {isLoading ? 'Mencari…' : 'Cari'}
          </Button>
        </form>
      </Card>

      {isError && (
        <Card>
          <p style={{ color: 'var(--danger)', margin: 0 }}>
            {error?.response?.data?.error ?? 'Booking tidak ditemukan.'}
          </p>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <div className="kv-grid">
              <div className="kv-grid__item">
                <div className="kv-grid__lbl">No. Job</div>
                <div className="kv-grid__val mono">{data.booking.job_no}</div>
              </div>
              <div className="kv-grid__item">
                <div className="kv-grid__lbl">Shipper</div>
                <div className="kv-grid__val">{data.booking.shipper || '—'}</div>
              </div>
              <div className="kv-grid__item">
                <div className="kv-grid__lbl">Port</div>
                <div className="kv-grid__val">{data.booking.port || '—'}</div>
              </div>
            </div>
          </Card>

          {data.docs.length === 0 ? (
            <Card>
              <Empty title="Tidak ada dokumen" sub="Booking ini belum memiliki dokumen." />
            </Card>
          ) : (
            data.docs.map(doc => (
              <DocCard key={doc.id} doc={doc} payments={paymentsByDoc[doc.id] ?? []} />
            ))
          )}
        </>
      )}
    </div>
  );
}
