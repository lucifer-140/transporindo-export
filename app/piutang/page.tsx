import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getPiutangs } from './actions';

export default async function PiutangPage() {
    const piutangs = await getPiutangs();

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Piutang List (Accounts Receivable)</h1>
                <Link
                    href="/piutang/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Receipt
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No. Piutang</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nominal</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Received For (Inv)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {piutangs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                                    No receipts found.
                                </td>
                            </tr>
                        ) : (
                            piutangs.map((piutang) => (
                                <tr key={piutang.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{piutang.noPiutang}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(piutang.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {piutang.paymentType}
                                        {piutang.paymentType !== 'Cash' && (
                                            <span className="block text-xs text-gray-400">
                                                {piutang.giroNo} - {piutang.giroDate ? new Date(piutang.giroDate).toLocaleDateString() : '-'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(piutang.nominal))}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{piutang.invoice.invoiceNo}</td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <a href={`/piutang/${piutang.id}/edit`} className="text-blue-600 hover:text-blue-900 mr-4">Edit</a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
