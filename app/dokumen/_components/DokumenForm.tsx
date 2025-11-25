'use client';

import { createDokumen, updateDokumen } from '../actions';

interface DokumenFormProps {
    jobs: any[];
    initialData?: any;
}

export default function DokumenForm({ jobs, initialData }: DokumenFormProps) {
    const isEditMode = !!initialData;

    const handleSubmit = async (formData: FormData) => {
        if (isEditMode) {
            await updateDokumen(initialData.id, formData);
        } else {
            await createDokumen(formData);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEditMode ? 'Edit Dokumen' : 'Create New Dokumen'}</h1>

            <form action={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                    <div className="sm:col-span-3">
                        <label htmlFor="docNo" className="block text-sm font-medium text-slate-700">No. Dokumen</label>
                        <div className="mt-1">
                            <input type="text" name="docNo" id="docNo" required defaultValue={initialData?.docNo} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="docType" className="block text-sm font-medium text-slate-700">Tipe Dokumen</label>
                        <div className="mt-1">
                            <select name="docType" id="docType" defaultValue={initialData?.docType} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border">
                                <option value="Invoice">Invoice</option>
                                <option value="Surat Jalan">Surat Jalan</option>
                                <option value="Berita Acara">Berita Acara</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="receiptNo" className="block text-sm font-medium text-slate-700">No. Quitansi</label>
                        <div className="mt-1">
                            <input type="text" name="receiptNo" id="receiptNo" required defaultValue={initialData?.receiptNo} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="receiptDate" className="block text-sm font-medium text-slate-700">Tgl Quitansi</label>
                        <div className="mt-1">
                            <input type="date" name="receiptDate" id="receiptDate" required defaultValue={initialData?.receiptDate ? new Date(initialData.receiptDate).toISOString().split('T')[0] : ''} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor="jobId" className="block text-sm font-medium text-slate-700">No. Order (Job)</label>
                        <div className="mt-1">
                            <select name="jobId" id="jobId" required defaultValue={initialData?.jobId} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border">
                                <option value="">Select a Job...</option>
                                {jobs.map(job => (
                                    <option key={job.id} value={job.id}>
                                        {job.jobNo} - {job.customer}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Keterangan</label>
                        <div className="mt-1">
                            <input type="text" name="description" id="description" defaultValue={initialData?.description || ''} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="transporterName" className="block text-sm font-medium text-slate-700">Pengangkutan</label>
                        <div className="mt-1">
                            <input type="text" name="transporterName" id="transporterName" defaultValue={initialData?.transporterName || ''} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border" />
                        </div>
                    </div>

                    <div className="sm:col-span-3">
                        <label htmlFor="cost" className="block text-sm font-medium text-slate-700">Biaya</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">Rp</span>
                            </div>
                            <input type="number" name="cost" id="cost" required defaultValue={initialData?.cost} className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border" placeholder="0.00" />
                        </div>
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor="paymentType" className="block text-sm font-medium text-slate-700">Tipe Pembayaran</label>
                        <div className="mt-1">
                            <select name="paymentType" id="paymentType" defaultValue={initialData?.paymentType} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border">
                                <option value="Cash">Cash</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                    </div>

                </div>

                <div className="pt-5">
                    <div className="flex justify-end">
                        <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            {isEditMode ? 'Update Dokumen' : 'Save Dokumen'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
