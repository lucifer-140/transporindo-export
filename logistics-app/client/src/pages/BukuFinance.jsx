import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBuku } from '../api/buku.js';

function formatRp(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n ?? 0);
}

function formatPeriode(tahun, bulan) {
  return `${tahun}/${String(bulan).padStart(2, '0')}`;
}

const STATUS_BADGE = {
  lunas:       'bg-green-100 text-green-700',
  sebagian:    'bg-yellow-100 text-yellow-700',
  belum_bayar: 'bg-red-100 text-red-600',
  none:        'bg-gray-100 text-gray-500',
};
const STATUS_LABEL = {
  lunas: 'Lunas', sebagian: 'Sebagian', belum_bayar: 'Belum Bayar', none: '—',
};

export default function BukuFinance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['buku', id],
    queryFn: () => getBuku(id),
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="text-sm text-gray-500">Memuat…</div>;
  if (isError)   return <div className="text-sm text-red-500">Gagal memuat data.</div>;

  const { buku, shippers, booking_count } = data;
  const grandTagihan = shippers.reduce((s, x) => s + x.total_tagihan, 0);
  const grandPaid    = shippers.reduce((s, x) => s + x.total_paid, 0);
  const grandSisa    = grandTagihan - grandPaid;

  function toggle(shipper) {
    setExpanded(e => ({ ...e, [shipper]: !e[shipper] }));
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/buku/${id}`)} className="text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 font-mono">Finance — Buku {formatPeriode(buku.tahun, buku.bulan)}</h2>
          <p className="text-sm text-gray-500">{booking_count} booking</p>
        </div>
        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${buku.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {buku.status === 'open' ? 'Open' : 'Closed'}
        </span>
        <div className="ml-auto">
          <button
            onClick={() => navigate('/bookings/new', { state: { buku_id: buku.id, buku_periode: formatPeriode(buku.tahun, buku.bulan) } })}
            className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
          >
            + Booking Baru
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Tagihan', value: grandTagihan, cls: 'text-gray-800' },
          { label: 'Dibayar',       value: grandPaid,    cls: 'text-green-700' },
          { label: 'Sisa',          value: grandSisa,    cls: grandSisa > 0 ? 'text-red-600' : 'text-green-700' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-base font-semibold ${cls}`}>{formatRp(value)}</p>
          </div>
        ))}
      </div>

      {shippers.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">Belum ada booking di buku ini.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {shippers.map(s => (
            <div key={s.shipper} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                onClick={() => toggle(s.shipper)}
              >
                <span className="font-medium text-gray-800 flex-1">{s.shipper}</span>
                <span className="text-xs text-gray-500">{s.bookings.length} booking</span>
                <div className="flex gap-6 text-sm">
                  <span className="text-gray-500">Tagihan: <span className="font-medium text-gray-800">{formatRp(s.total_tagihan)}</span></span>
                  <span className="text-gray-500">Dibayar: <span className="font-medium text-green-700">{formatRp(s.total_paid)}</span></span>
                  <span className="text-gray-500">Sisa: <span className={`font-medium ${s.sisa > 0 ? 'text-red-600' : 'text-green-700'}`}>{formatRp(s.sisa)}</span></span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
                <span className="text-gray-400 text-xs ml-1">{expanded[s.shipper] ? '▲' : '▼'}</span>
              </button>

              {expanded[s.shipper] && (
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Job No</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Tagihan</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Dibayar</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Sisa</th>
                        <th className="px-4 py-2 text-xs font-medium text-gray-500">Piutang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {s.bookings.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <Link to={`/bookings/${b.id}`} state={{ buku_id: buku.id, buku_periode: formatPeriode(buku.tahun, buku.bulan) }} className="text-blue-600 hover:underline font-mono text-xs">
                              {b.job_no}
                            </Link>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${b.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {b.status === 'done' ? 'Done' : 'In Progress'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700">{formatRp(b.tagihan)}</td>
                          <td className="px-4 py-2 text-right text-green-700">{formatRp(b.total_paid)}</td>
                          <td className="px-4 py-2 text-right">{formatRp(b.sisa)}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[b.piutang_status]}`}>
                              {STATUS_LABEL[b.piutang_status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
