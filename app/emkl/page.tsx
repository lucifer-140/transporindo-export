import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import { Plus, Eye } from 'lucide-react';
import DeleteButton from '../../components/DeleteButton';
import { deleteJob } from './actions';

const prisma = new PrismaClient();

async function getJobs() {
    return await prisma.emklJob.findMany({
        orderBy: { createdAt: 'desc' },
        include: { containers: true }
    });
}

export default async function EmklListPage() {
    const jobs = await getJobs();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">EMKL Jobs</h1>
                <Link
                    href="/emkl/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Job
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Job No</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vessel</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Containers</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {jobs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-sm text-slate-500">
                                    No jobs found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            jobs.map((job) => (
                                <tr key={job.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{job.jobNo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(job.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{job.customer}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{job.vesselName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{job.containers.length}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center">
                                        <Link href={`/emkl/${job.id}`} className="text-blue-600 hover:text-blue-900 flex items-center">
                                            View
                                        </Link>
                                        <DeleteButton id={job.id} deleteAction={deleteJob} />
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
