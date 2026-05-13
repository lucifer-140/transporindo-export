import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBukuBookings } from '../api/buku.js';
import { useAuth } from '../hooks/useAuth.js';

function formatPeriode(tahun, bulan) {
  return `${tahun}/${String(bulan).padStart(2, '0')}`;
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BukuDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFinance } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['buku-bookings', id],
    queryFn: () => getBukuBookings(id),
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="text-sm text-gray-500">Memuat…</div>;
  if (isError)   return <div className="text-sm text-red-500">Gagal memuat data.</div>;

  const { buku, bookings } = data;

  return (
    <div className="max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/buku')} className="text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h2 className="text-xl font-bold text-gray-800 font-mono">Buku {formatPeriode(buku.tahun, buku.bulan)}</h2>
          <p className="text-sm text-gray-500">{bookings.length} booking</p>
        </div>
        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${buku.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {buku.status === 'open' ? 'Open' : 'Closed'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {isFinance && (
            <Link
              to={`/buku/${id}/finance`}
              className="text-sm text-blue-600 hover:underline border border-blue-200 rounded px-3 py-1.5"
            >
              Lihat Finance →
            </Link>
          )}
          <button
            onClick={() => navigate('/bookings/new', { state: { buku_id: buku.id, buku_periode: formatPeriode(buku.tahun, buku.bulan) } })}
            className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
          >
            + Booking Baru
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-sm text-gray-500 py-8 text-center">Belum ada booking di buku ini.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['ID', 'Job No', 'Shipper', 'PEB', 'Port', 'Feeder', 'Vessel Name', 'Vessel No', 'BON', 'Status', 'Notes', 'Tanggal'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 text-xs">{b.id}</td>
                    <td className="px-3 py-2">
                      <Link
                        to={`/bookings/${b.id}`}
                        state={{ buku_id: buku.id, buku_periode: formatPeriode(buku.tahun, buku.bulan) }}
                        className="text-blue-600 hover:underline font-mono text-xs"
                      >
                        {b.job_no}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{b.shipper || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">{b.peb || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{b.port || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{b.feeder || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{b.vessel_name || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">{b.vessel_no || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono text-xs">{b.bon || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${b.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {b.status === 'done' ? 'Done' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{b.notes || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
