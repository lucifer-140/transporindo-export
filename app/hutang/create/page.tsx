'use client';

import { useState, useEffect } from 'react';
import { createHutang, getDokumensForHutang } from '../actions';

export default function CreateHutangPage() {
    const [dokumens, setDokumens] = useState<any[]>([]);
    const [selectedDokumen, setSelectedDokumen] = useState<any>(null);
    const [paymentType, setPaymentType] = useState('Cash');
    const [filterType, setFilterType] = useState('docType');
    const [filterValue, setFilterValue] = useState('');

    useEffect(() => {
        async function fetchDokumens() {
            const docs = await getDokumensForHutang(filterType, filterValue);
            setDokumens(docs);
        }
        fetchDokumens();
    }, [filterType, filterValue]);

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Hutang (Payment)</h1>

            <form action={createHutang} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                    {/* Payment Details */}
                    <div className="sm:col-span-3">
                        <label htmlFor="noHutang" className="block text-sm font-medium text-slate-700">No. Hutang</label>
                        <input type="text" name="noHutang" id="noHutang" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
                        <input type="date" name="date" id="date" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="paymentType" className="block text-sm font-medium text-slate-700">Payment Type</label>
                        <select
                            name="paymentType"
                            id="paymentType"
                            value={paymentType}
                            onChange={(e) => setPaymentType(e.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                            <option value="Cash">Cash</option>
                            <option value="Giro">Giro</option>
                            <option value="Cek">Cek</option>
                        </select>
                    </div>

                    {paymentType !== 'Cash' && (
                        <>
                            <div className="sm:col-span-3">
                                <label htmlFor="giroNo" className="block text-sm font-medium text-slate-700">Giro/Cek No</label>
                                <input type="text" name="giroNo" id="giroNo" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </div>
                            <div className="sm:col-span-3">
                                <label htmlFor="giroDate" className="block text-sm font-medium text-slate-700">Giro Date (Cair)</label>
                                <input type="date" name="giroDate" id="giroDate" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </div>
                        </>
                    )}

                    <div className="sm:col-span-3">
                        <label htmlFor="nominal" className="block text-sm font-medium text-slate-700">Nominal</label>
                        <input type="number" name="nominal" id="nominal" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="kodePerkiraan" className="block text-sm font-medium text-slate-700">Kode Perkiraan</label>
                        <input type="text" name="kodePerkiraan" id="kodePerkiraan" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="namaPerkiraan" className="block text-sm font-medium text-slate-700">Nama Perkiraan</label>
                        <input type="text" name="namaPerkiraan" id="namaPerkiraan" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    {/* Document Selection */}
                    <div className="sm:col-span-6 border-t pt-4">
                        <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Select Document to Pay</h3>

                        <div className="flex gap-4 mb-4">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="docType">Document Type</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Filter value..."
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                className="rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm flex-1"
                            />
                        </div>

                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg max-h-60 overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-300">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Select</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Receipt No</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Date</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Cost</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {dokumens.map((doc) => (
                                        <tr key={doc.id} className={selectedDokumen?.id === doc.id ? 'bg-blue-50' : ''}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                <input
                                                    type="radio"
                                                    name="dokumenId"
                                                    value={doc.id}
                                                    onChange={() => setSelectedDokumen(doc)}
                                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{doc.receiptNo}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{new Date(doc.receiptDate).toLocaleDateString()}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(doc.cost))}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{doc.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <div className="pt-5">
                    <div className="flex justify-end">
                        <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Save Hutang
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
