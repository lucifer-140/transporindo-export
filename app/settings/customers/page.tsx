import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { getCustomers, deleteCustomer } from './actions';
import DeleteButton from '../../../components/DeleteButton';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams;
    const customers = await getCustomers(q);

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
                    <p className="mt-2 text-sm text-slate-700">
                        A list of all customers including their code and company name.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link
                        href="/settings/customers/create"
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Customer
                    </Link>
                </div>
            </div>

            <div className="mt-8 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <form>
                        <input
                            type="text"
                            name="q"
                            defaultValue={q}
                            className="block w-full rounded-md border-slate-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 shadow-sm border"
                            placeholder="Search customers..."
                        />
                    </form>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            {customers.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500 bg-white">
                                    No customers found.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-slate-300">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Code</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Company Name</th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {customers.map((customer) => (
                                            <tr key={customer.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">{customer.code}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{customer.name}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <div className="flex justify-end items-center gap-4">
                                                        <Link href={`/settings/customers/${customer.id}/edit`} className="text-blue-600 hover:text-blue-900">
                                                            Edit<span className="sr-only">, {customer.name}</span>
                                                        </Link>
                                                        <DeleteButton id={customer.id} deleteAction={deleteCustomer} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
