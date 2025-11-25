import { PrismaClient } from '@prisma/client';
import { Truck, Container, FileText, CheckCircle } from 'lucide-react';

const prisma = new PrismaClient();

async function getStats() {
  const jobCount = await prisma.emklJob.count();
  const containerCount = await prisma.container.count();

  // Get recent jobs
  const recentJobs = await prisma.emklJob.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { containers: true }
  });

  return {
    jobs: jobCount,
    containers: containerCount,
    recentJobs
  };
}

export default async function Home() {
  const stats = await getStats();

  const cards = [
    { name: 'Total Jobs', value: stats.jobs, icon: FileText, color: 'bg-blue-500' },
    { name: 'Total Containers', value: stats.containers, icon: Container, color: 'bg-orange-500' },
    { name: 'Active Shipments', value: stats.jobs, icon: Truck, color: 'bg-green-500' }, // Placeholder logic
    { name: 'Completed', value: 0, icon: CheckCircle, color: 'bg-purple-500' }, // Placeholder
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-md ${card.color} text-white`}>
                    <card.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-slate-500">{card.name}</dt>
                    <dd>
                      <div className="text-lg font-medium text-slate-900">{card.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Recent Jobs</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-slate-200">
            {stats.recentJobs.length === 0 ? (
              <li className="px-4 py-4 sm:px-6 text-sm text-slate-500">No jobs found.</li>
            ) : (
              stats.recentJobs.map((job) => (
                <li key={job.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-blue-600">{job.jobNo}</p>
                      <div className="ml-2 flex flex-shrink-0">
                        <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                          {job.containers.length} Containers
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-slate-500">
                          <Truck className="mr-1.5 h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
                          {job.customer}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                        <p>
                          {job.date.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
