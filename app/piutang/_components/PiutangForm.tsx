'use client';

import { useState, useEffect } from 'react';
import { createPiutang, updatePiutang, searchInvoices } from '../actions';

interface PiutangFormProps {
    initialData?: any;
}

export default function PiutangForm({ initialData }: PiutangFormProps) {
    const isEditMode = !!initialData;
    const [invoices, setInvoices] = useState<any[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(initialData?.invoice || null);
    const [paymentType, setPaymentType] = useState(initialData?.paymentType || 'Cash');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchInvoices() {
            if (searchQuery) {
                const results = await searchInvoices(searchQuery);
                setInvoices(results);
            } else {
                setInvoices([]);
            }
        }
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchInvoices();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSubmit = async (formData: FormData) => {
        if (isEditMode) {
            await updatePiutang(initialData.id, formData);
        } else {
            await createPiutang(formData);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEditMode ? 'Edit Piutang' : 'Create New Piutang'}</h1>

            <form action={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                    {/* Payment Details */}
                    <div className="sm:col-span-3">
                        <label htmlFor="noPiutang" className="block text-sm font-medium text-slate-700">No. Piutang</label>
                        <input type="text" name="noPiutang" id="noPiutang" required defaultValue={initialData?.noPiutang} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700">Date</label>
                        <input type="date" name="date" id="date" required defaultValue={initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
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
                                <input type="text" name="giroNo" id="giroNo" defaultValue={initialData?.giroNo} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </div>
                            <div className="sm:col-span-3">
                                <label htmlFor="giroDate" className="block text-sm font-medium text-slate-700">Giro Date (Cair)</label>
                                <input type="date" name="giroDate" id="giroDate" defaultValue={initialData?.giroDate ? new Date(initialData.giroDate).toISOString().split('T')[0] : ''} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                            </div>
                        </>
                    )}

                    <div className="sm:col-span-3">
                        <label htmlFor="nominal" className="block text-sm font-medium text-slate-700">Nominal</label>
                        <input type="number" name="nominal" id="nominal" required defaultValue={initialData?.nominal} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="kodePerkiraan" className="block text-sm font-medium text-slate-700">Kode Perkiraan</label>
                        <input type="text" name="kodePerkiraan" id="kodePerkiraan" required defaultValue={initialData?.kodePerkiraan} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="namaPerkiraan" className="block text-sm font-medium text-slate-700">Nama Perkiraan</label>
                        <input type="text" name="namaPerkiraan" id="namaPerkiraan" required defaultValue={initialData?.namaPerkiraan} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                    </div>

                    {/* Invoice Selection */}
                    <div className="sm:col-span-6 border-t pt-4">
                        <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Select Invoice to Receive Payment</h3>

                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Search Customer Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>

                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg max-h-60 overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-300">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Select</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Invoice No</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Customer</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Total</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Paid</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Remaining</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {invoices.map((inv) => {
                                        const totalAmount = inv.items.reduce((sum: number, item: any) => sum + Number(item.total), 0);
                                        const totalPaid = inv.piutangs.reduce((sum: number, p: any) => sum + Number(p.nominal), 0);
                                        const remaining = totalAmount - totalPaid;

                                        return (
                                            <tr key={inv.id} className={selectedInvoice?.id === inv.id ? 'bg-blue-50' : ''}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                    <input
                                                        type="radio"
                                                        name="invoiceId"
                                                        value={inv.id}
                                                        checked={selectedInvoice?.id === inv.id}
                                                        onChange={() => setSelectedInvoice(inv)}
                                                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                                    />
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{inv.invoiceNo}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{inv.customer}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAmount)}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalPaid)}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(remaining)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <div className="pt-5">
                    <div className="flex justify-end">
                        <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            {isEditMode ? 'Update Piutang' : 'Save Piutang'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
