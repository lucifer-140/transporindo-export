'use client';

import { createCustomer, updateCustomer } from '../actions';

interface CustomerFormProps {
    initialData?: {
        id: number;
        code: string;
        name: string;
    };
}

export default function CustomerForm({ initialData }: CustomerFormProps) {
    const isEditMode = !!initialData;

    const handleSubmit = async (formData: FormData) => {
        if (isEditMode && initialData) {
            await updateCustomer(initialData.id, formData);
        } else {
            await createCustomer(formData);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEditMode ? 'Edit Customer' : 'Add New Customer'}</h1>

            <form action={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                        <label htmlFor="code" className="block text-sm font-medium text-slate-700">Customer Code</label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="code"
                                id="code"
                                required
                                defaultValue={initialData?.code}
                                placeholder="e.g. AI"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border"
                            />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">A unique code for the customer.</p>
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Company Name</label>
                        <div className="mt-1">
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                defaultValue={initialData?.name}
                                placeholder="e.g. PT. ASNAFF INTERNATIONAL"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-5">
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {isEditMode ? 'Update Customer' : 'Save Customer'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
