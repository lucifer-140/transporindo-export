import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import { Badge, Button, Card, Empty, Field, Input, Modal, Select, fmtDate } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { IconEdit, IconTrash, IconPlus } from '../components/Icons.jsx';

function fmtRp(val) {
  if (!val && val !== 0) return '—';
  return 'Rp ' + Number(val).toLocaleString('id-ID');
}

function PaymentModal({ open, onClose, hutang, editPay, isPending, onSave }) {
  const [noVoucher, setNoVoucher] = useState(editPay?.no_voucher ?? '');
  const [pelunasan, setPelunasan] = useState(editPay ? String(editPay.nilai_pembayaran ?? '') : '');
  const [tanggal, setTanggal] = useState(editPay?.tgl_pembayaran ?? new Date().toISOString().slice(0, 10));
  const [metode, setMetode] = useState(editPay?.metode ?? 'transfer');

  const total = hutang?.biaya_trucking ?? 0;
  const alreadyPaid = hutang?.total_paid ?? 0;
  const sisaSebelum = editPay
    ? Math.max(0, total - (alreadyPaid - (editPay.nilai_pembayaran ?? 0)))
    : Math.max(0, total - alreadyPaid);
  const pelNum = Number(pelunasan) || 0;
  const pelOver = pelNum > 0 && pelNum > sisaSebelum;
  const sisaSetelah = Math.max(0, sisaSebelum - pelNum);
  const canSubmit = pelunasan && tanggal && !isPending && !pelOver;

  return (
    <Modal open={open} onClose={onClose} title={editPay ? 'Edit Pembayaran' : 'Bayar Hutang Trucking'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" disabled={!canSubmit}
            onClick={() => onSave({ no_voucher: noVoucher || null, nilai_pembayaran: pelunasan, tgl_pembayaran: tanggal, metode })}>
            Simpan
          </Button>
        </>
      }>
      <div className="col" style={{ gap: 14 }}>
        <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-2)', fontSize: 12 }}>
          <div className="kv-grid" style={{ gap: '4px 16px' }}>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Cont No.</div><div className="kv-grid__val mono">{hutang?.container_no || '—'}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Trucking</div><div className="kv-grid__val">{hutang?.trucking || '—'}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Size</div><div className="kv-grid__val">{hutang?.size || '—'}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">No. SP</div><div className="kv-grid__val">{hutang?.no_sp || '—'}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Total</div><div className="kv-grid__val num strong">{fmtRp(total)}</div></div>
            <div className="kv-grid__item"><div className="kv-grid__lbl">Sisa</div><div className={`kv-grid__val num ${sisaSebelum > 0 ? 'warn' : 'ok'}`}>{fmtRp(sisaSebelum)}</div></div>
          </div>
        </div>

        <div className="grid grid-form-2">
          <Field label="No. Voucher" span={2}>
            <Input value={noVoucher} onChange={e => setNoVoucher(e.target.value)} placeholder="opsional" />
          </Field>
          <Field label="Pelunasan (Rp)" required>
            <Input type="number" min={1} value={pelunasan} onChange={e => setPelunasan(e.target.value)} placeholder="0"
              style={pelOver ? { borderColor: 'var(--danger, #e53e3e)', outline: 'none', boxShadow: '0 0 0 2px rgba(229,62,62,.15)' } : {}} />
            {pelOver && <span style={{ fontSize: 11, color: 'var(--danger, #e53e3e)', marginTop: 4, display: 'block' }}>Melebihi sisa hutang ({fmtRp(sisaSebelum)})</span>}
          </Field>
          <Field label="Tanggal" required>
            <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} />
          </Field>
          <Field label="Metode" required>
            <Select value={metode} onChange={e => setMetode(e.target.value)}>
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
              <option value="giro">Giro</option>
              <option value="lainnya">Lainnya</option>
            </Select>
          </Field>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="muted" style={{ fontSize: 11 }}>Sisa setelah pembayaran</span>
            <span className={`num strong ${sisaSetelah > 0 ? 'warn' : 'ok'}`} style={{ fontSize: 16 }}>{fmtRp(sisaSetelah)}</span>
          </div>
          <div className="col" style={{ gap: 2, textAlign: 'right' }}>
            <span className="muted" style={{ fontSize: 11 }}>Pelunasan</span>
            <span className="num strong" style={{ fontSize: 16, color: pelOver ? 'var(--danger, #e53e3e)' : undefined }}>{fmtRp(pelNum)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function BulkPayModal({ open, onClose, selectedRows, isPending, onSave }) {
  const [noVoucher, setNoVoucher] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [metode, setMetode] = useState('transfer');

  const totalSisa = selectedRows.reduce((s, r) => s + (r.sisa ?? 0), 0);
  const canSubmit = tanggal && !isPending;

  return (
    <Modal open={open} onClose={onClose} title={`Bayar Terpilih (${selectedRows.length} container)`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" disabled={!canSubmit}
            onClick={() => onSave({ no_voucher: noVoucher || null, tgl_pembayaran: tanggal, metode })}>
            Simpan ({selectedRows.length})
          </Button>
        </>
      }>
      <div className="col" style={{ gap: 14 }}>
        <div style={{ borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)', color: 'var(--fg-3)' }}>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500 }}>Container</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500 }}>Trucking</th>
                <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 500 }}>Sisa</th>
              </tr>
            </thead>
            <tbody>
              {selectedRows.map((r, i) => (
                <tr key={r.hutang_id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <td className="mono" style={{ padding: '6px 10px' }}>{r.container_no || '—'}</td>
                  <td style={{ padding: '6px 10px' }}>{r.trucking || '—'}</td>
                  <td className="num" style={{ padding: '6px 10px', color: 'var(--warn)' }}>{fmtRp(r.sisa)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-2)' }}>
                <td colSpan={2} style={{ padding: '7px 10px', fontWeight: 600, fontSize: 12 }}>Total</td>
                <td className="num" style={{ padding: '7px 10px', fontWeight: 700, fontSize: 13 }}>{fmtRp(totalSisa)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-form-2">
          <Field label="No. Voucher" span={2}>
            <Input value={noVoucher} onChange={e => setNoVoucher(e.target.value)} placeholder="opsional" />
          </Field>
          <Field label="Tanggal" required>
            <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} />
          </Field>
          <Field label="Metode" required>
            <Select value={metode} onChange={e => setMetode(e.target.value)}>
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
              <option value="giro">Giro</option>
              <option value="lainnya">Lainnya</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function PaymentRow({ entry, onDelete, onEdit }) {
  return (
    <>
      <tr style={{ borderTop: '1px solid var(--border)' }}>
        <td style={{ padding: '6px 10px' }}>{entry.tgl_pembayaran ? fmtDate(entry.tgl_pembayaran) : '—'}</td>
        <td style={{ padding: '6px 10px', textTransform: 'capitalize' }}>{entry.metode || '—'}</td>
        <td style={{ padding: '6px 10px' }} className="mono">{entry.no_voucher || <span className="dim">—</span>}</td>
        <td style={{ padding: '6px 10px', textAlign: 'right' }} className="num">{fmtRp(entry.nilai_pembayaran)}</td>
        <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <Button variant="ghost" size="sm" icon={<IconEdit size={11} />} onClick={e => { e.stopPropagation(); onEdit(entry); }} />
          <Button variant="ghost" size="sm" icon={<IconTrash size={11} />} onClick={e => { e.stopPropagation(); onDelete(entry.id); }} />
        </td>
      </tr>
    </>
  );
}

function ContainerRow({ row, checked, onCheck }) {
  const [expanded, setExpanded] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [editPay, setEditPay] = useState(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hutang-trucking'] });

  const addMutation = useMutation({
    mutationFn: ({ nilai_pembayaran, ...rest }) => api.post('/hutang-trucking/payments', {
      payments: [{ hutang_id: row.hutang_id, nilai_pembayaran }], ...rest,
    }).then(r => r.data),
    onSuccess: () => { invalidate(); toast('Pembayaran dicatat.'); setPayModal(false); },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menyimpan.', 'error'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }) => api.put(`/hutang-trucking/payments/${id}`, body).then(r => r.data),
    onSuccess: () => { invalidate(); toast('Pembayaran diperbarui.'); setEditPay(null); },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal memperbarui.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/hutang-trucking/payments/${id}`),
    onSuccess: () => { invalidate(); toast('Pembayaran dihapus.'); },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menghapus.', 'error'),
  });

  return (
    <>
      <tr
        style={{ cursor: 'pointer', background: expanded ? 'var(--bg-2)' : '', borderLeft: expanded ? '3px solid var(--primary, #3b82f6)' : '3px solid transparent' }}
        onClick={() => setExpanded(v => !v)}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'var(--bg-2)'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = ''; }}
      >
        <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={checked} disabled={row.status === 'lunas'}
            onChange={e => onCheck(row.hutang_id, e.target.checked)}
            style={{ cursor: row.status === 'lunas' ? 'not-allowed' : 'pointer', opacity: row.status === 'lunas' ? 0.35 : 1 }} />
        </td>
        <td className="mono" style={{ padding: '8px 10px' }}>{row.container_no || '—'}</td>
        <td style={{ padding: '8px 10px' }}>{row.size || '—'}</td>
        <td style={{ padding: '8px 10px' }}>{row.trucking || '—'}</td>
        <td style={{ padding: '8px 10px' }}>{row.no_sp || '—'}</td>
        <td className="num" style={{ padding: '8px 10px' }}>{fmtRp(row.biaya_trucking)}</td>
        <td className="num" style={{ padding: '8px 10px' }}>{fmtRp(row.total_paid)}</td>
        <td className="num" style={{ padding: '8px 10px', color: row.sisa > 0 ? 'var(--danger)' : 'var(--ok)', fontWeight: 500 }}>{fmtRp(row.sisa)}</td>
        <td style={{ padding: '8px 10px' }}><Badge status={row.status} /></td>
      </tr>

      {expanded && (
        <tr style={{ borderLeft: '3px solid var(--primary, #3b82f6)' }}>
          <td colSpan={9} style={{ padding: '14px 18px 14px 20px', background: 'var(--bg-1)', borderBottom: '2px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Riwayat Pembayaran
            </div>
            {row.payments.length > 0 ? (
              <div style={{ marginBottom: 12, borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-2)', color: 'var(--fg-3)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500 }}>Tanggal</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500 }}>Metode</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 500 }}>No. Voucher</th>
                      <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 500 }}>Jumlah</th>
                      <th style={{ width: 72, padding: '6px 10px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {row.payments.map(p => (
                      <PaymentRow key={p.id} entry={p}
                        onDelete={id => deleteMutation.mutate(id)}
                        onEdit={pay => setEditPay(pay)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 12, fontStyle: 'italic' }}>Belum ada pembayaran.</div>
            )}
            {row.sisa > 0 && (
              <Button variant="primary" size="sm" onClick={e => { e.stopPropagation(); setPayModal(true); }}>Bayar</Button>
            )}
            {row.sisa <= 0 && (
              <span style={{ fontSize: 12, color: 'var(--ok, #38a169)', fontWeight: 600 }}>✓ Lunas</span>
            )}
          </td>
        </tr>
      )}

      <PaymentModal
        key={payModal ? 'pay-open' : 'pay-closed'}
        open={payModal} onClose={() => setPayModal(false)}
        hutang={row} isPending={addMutation.isPending}
        onSave={data => addMutation.mutate(data)}
      />
      <PaymentModal
        key={editPay ? `edit-${editPay.id}` : 'edit-closed'}
        open={!!editPay} onClose={() => setEditPay(null)}
        hutang={row} editPay={editPay} isPending={editMutation.isPending}
        onSave={data => editMutation.mutate({ id: editPay.id, body: data })}
      />
    </>
  );
}

export default function HutangTrucking() {
  const [jobInput, setJobInput] = useState('');
  const [searchJob, setSearchJob] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['hutang-trucking', searchJob],
    queryFn: () => api.get('/hutang-trucking', { params: { job: searchJob } }).then(r => r.data),
    enabled: !!searchJob,
    retry: false,
  });

  const bulkMutation = useMutation({
    mutationFn: (body) => api.post('/hutang-trucking/payments', body).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hutang-trucking'] });
      toast(`${selected.size} pembayaran ditambahkan.`);
      setShowBulk(false);
      setSelected(new Set());
    },
    onError: (e) => toast(e.response?.data?.error ?? 'Gagal menyimpan.', 'error'),
  });

  function handleSearch(e) {
    e.preventDefault();
    setSelected(new Set());
    setSearchJob(jobInput.trim());
  }

  function handleCheck(hutangId, checked) {
    setSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(hutangId) : next.delete(hutangId);
      return next;
    });
  }

  function handleSelectAll(e) {
    if (e.target.checked) setSelected(new Set((data?.rows ?? []).filter(r => r.status !== 'lunas').map(r => r.hutang_id)));
    else setSelected(new Set());
  }

  const rows = data?.rows ?? [];
  const selectableRows = rows.filter(r => r.status !== 'lunas');
  const allChecked = selectableRows.length > 0 && selectableRows.every(r => selected.has(r.hutang_id));
  const someChecked = selected.size > 0 && !allChecked;
  const selectedRows = rows.filter(r => selected.has(r.hutang_id));

  const totalBiaya = rows.reduce((s, r) => s + (r.biaya_trucking ?? 0), 0);
  const totalBayar = rows.reduce((s, r) => s + (r.total_paid ?? 0), 0);
  const totalSisa  = rows.reduce((s, r) => s + (r.sisa ?? 0), 0);

  return (
    <div className="col" style={{ gap: 20, maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Hutang Trucking</h1>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0' }}>Cari booking berdasarkan No. Job untuk input pembayaran trucking per container.</p>
      </div>

      <Card>
        <form className="row" style={{ gap: 10, alignItems: 'flex-end' }} onSubmit={handleSearch}>
          <Field label="No. Job" style={{ flex: 1 }}>
            <Input value={jobInput} onChange={e => setJobInput(e.target.value)} placeholder="Contoh: JOB-001" />
          </Field>
          <Button type="submit" variant="primary" disabled={!jobInput.trim() || isLoading}>
            {isLoading ? 'Mencari…' : 'Cari'}
          </Button>
        </form>
      </Card>

      {isError && (
        <Card>
          <p style={{ color: 'var(--danger)', margin: 0 }}>{error?.response?.data?.error ?? 'Booking tidak ditemukan.'}</p>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <div className="kv-grid">
              <div className="kv-grid__item"><div className="kv-grid__lbl">No. Job</div><div className="kv-grid__val mono">{data.booking.job_no}</div></div>
              <div className="kv-grid__item"><div className="kv-grid__lbl">Shipper</div><div className="kv-grid__val">{data.booking.shipper || '—'}</div></div>
              <div className="kv-grid__item"><div className="kv-grid__lbl">Port</div><div className="kv-grid__val">{data.booking.port || '—'}</div></div>
            </div>
          </Card>

          {rows.length === 0 ? (
            <Card><Empty title="Tidak ada data trucking" sub="Booking ini belum memiliki hutang trucking." /></Card>
          ) : (
            <>
              <Card pad={false} style={{ overflowX: 'auto' }}>
                <table className="tbl" style={{ minWidth: 780 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36, textAlign: 'center' }}>
                        <input type="checkbox" checked={allChecked}
                          ref={el => { if (el) el.indeterminate = someChecked; }}
                          onChange={handleSelectAll} style={{ cursor: 'pointer' }} />
                      </th>
                      <th>Container No</th>
                      <th>Size</th>
                      <th>Trucking</th>
                      <th>No. SP</th>
                      <th style={{ textAlign: 'right' }}>Biaya</th>
                      <th style={{ textAlign: 'right' }}>Total Bayar</th>
                      <th style={{ textAlign: 'right' }}>Sisa</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <ContainerRow key={row.hutang_id} row={row} checked={selected.has(row.hutang_id)} onCheck={handleCheck} />
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card>
                <div className="row" style={{ gap: 32, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 2 }}>Total Biaya</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{fmtRp(totalBiaya)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 2 }}>Total Dibayar</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ok)' }}>{fmtRp(totalBayar)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 2 }}>Total Sisa</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: totalSisa > 0 ? 'var(--danger)' : 'var(--ok)' }}>{fmtRp(totalSisa)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 2 }}>Lunas</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{rows.filter(r => r.status === 'lunas').length} / {rows.length}</div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 20px', display: 'flex', gap: 12,
          alignItems: 'center', boxShadow: 'var(--shadow-lg)', zIndex: 100,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.size} dipilih</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Batal</Button>
          <Button variant="primary" size="sm" icon={<IconPlus size={12} />} onClick={() => setShowBulk(true)}>
            Bayar Terpilih
          </Button>
        </div>
      )}

      <BulkPayModal
        key={showBulk ? 'bulk-open' : 'bulk-closed'}
        open={showBulk} onClose={() => setShowBulk(false)}
        selectedRows={selectedRows} isPending={bulkMutation.isPending}
        onSave={({ no_voucher, tgl_pembayaran, metode }) => bulkMutation.mutate({
          payments: selectedRows.map(r => ({ hutang_id: r.hutang_id, nilai_pembayaran: r.sisa })),
          no_voucher, tgl_pembayaran, metode,
        })}
      />
    </div>
  );
}
