'use client';

import { useState, useEffect } from 'react';
import { createInvoice, getJobs, getJobDetails } from '../actions';
import { Plus, Trash2 } from 'lucide-react';

type InvoiceItemType = 'INVOICE' | 'PAJAK' | 'REIMBURSEMENT' | 'KWITANSI';

interface InvoiceItem {
    id: number;
    type: InvoiceItemType;
    description: string;
    qty: number;
    price: number;
    total: number;
    date?: string;
    dpp?: number;
    ppn?: number;
}

export default function CreateInvoicePage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [formData, setFormData] = useState({
        jobId: '',
        customer: '',
        destination: '',
        commodity: '',
        vessel: '',
        voyageNo: '',
        paymentType: 'Cash'
    });

    useEffect(() => {
        getJobs().then(setJobs);
    }, []);

    const handleJobChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const jobId = e.target.value;
        setFormData(prev => ({ ...prev, jobId }));

        if (jobId) {
            const details = await getJobDetails(parseInt(jobId));
            if (details) {
                setFormData(prev => ({
                    ...prev,
                    customer: details.customer,
                    destination: details.destination || '',
                    commodity: details.commodity || '',
                    vessel: details.vesselName || '',
                    voyageNo: details.voyageNo || ''
                }));
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addItem = (type: InvoiceItemType) => {
        setItems([...items, {
            id: Date.now(),
            type,
            description: '',
            qty: 1,
            price: 0,
            total: 0,
            date: '',
            dpp: 0,
            ppn: 0
        }]);
    };

    const updateItem = (id: number, field: keyof InvoiceItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'qty' || field === 'price') {
                    updated.total = Number(updated.qty) * Number(updated.price);
                }
                return updated;
            }
            return item;
        }));
    };

    const removeItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    const renderItemTable = (type: InvoiceItemType, title: string) => {
        const typeItems = items.filter(i => i.type === type);

        return (
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-slate-900">{title}</h3>
                    <button type="button" onClick={() => addItem(type)} className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">
                        <Plus className="h-4 w-4 mr-2" /> Add Item
                    </button>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-20">Qty</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-32">Price</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-32">Total</th>
                                {type !== 'INVOICE' && <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-32">Date</th>}
                                {type === 'PAJAK' && (
                                    <>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-32">DPP</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-32">PPN</th>
                                    </>
                                )}
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {typeItems.map(item => (
                                <tr key={item.id}>
                                    <td className="px-4 py-2">
                                        <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-1" />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-1" />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input type="number" value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-1" />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input type="number" value={item.total} readOnly className="block w-full bg-slate-50 border-slate-300 rounded-md shadow-sm sm:text-sm border p-1" />
                                    </td>
                                    {type !== 'INVOICE' && (
                                        <td className="px-4 py-2">
                                            <input type="date" value={item.date} onChange={e => updateItem(item.id, 'date', e.target.value)} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-1" />
                                        </td>
                                    )}
                                    {type === 'PAJAK' && (
                                        <>
                                            <td className="px-4 py-2">
                                                <input type="number" value={item.dpp} onChange={e => updateItem(item.id, 'dpp', e.target.value)} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-1" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" value={item.ppn} onChange={e => updateItem(item.id, 'ppn', e.target.value)} className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border p-1" />
                                            </td>
                                        </>
                                    )}
                                    <td className="px-4 py-2 text-right">
                                        <button type="button" onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-900">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Invoice</h1>

            <form action={createInvoice} className="space-y-8">
                <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Invoice No</label>
                            <input type="text" name="invoiceNo" required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Date</label>
                            <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Order No (Job)</label>
                            <select name="jobId" value={formData.jobId} onChange={handleJobChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2">
                                <option value="">Select a Job...</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>{job.jobNo} - {job.customer}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-700">Customer</label>
                            <input type="text" name="customer" value={formData.customer} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-slate-700">Destination</label>
                            <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Commodity</label>
                            <input type="text" name="commodity" value={formData.commodity} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Vessel</label>
                            <input type="text" name="vessel" value={formData.vessel} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Voyage No</label>
                            <input type="text" name="voyageNo" value={formData.voyageNo} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2" />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Payment Type</label>
                            <select name="paymentType" value={formData.paymentType} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 rounded-md border p-2">
                                <option value="Cash">Cash</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                    </div>
                </div>

                {renderItemTable('INVOICE', 'Table Invoice')}
                {renderItemTable('PAJAK', 'Table Invoice Pajak')}
                {renderItemTable('REIMBURSEMENT', 'Table Reimbursement')}
                {renderItemTable('KWITANSI', 'Table Kwitansi')}

                <input type="hidden" name="items" value={JSON.stringify(items)} />

                <div className="flex justify-end pt-5">
                    <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Save Invoice
                    </button>
                </div>
            </form>
        </div>
    );
}
