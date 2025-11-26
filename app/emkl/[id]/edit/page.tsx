import { getJob } from '../../actions';
import JobForm from '../../_components/JobForm';
import { notFound } from 'next/navigation';

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const job = await getJob(parseInt(id));

    if (!job) {
        notFound();
    }

    const serializedJob = {
        ...job,
        date: job.date.toISOString(),
        eta: job.eta?.toISOString() || null,
        pebDate: job.pebDate?.toISOString() || null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        containers: job.containers.map(c => ({
            ...c,
            cost: Number(c.cost), // Convert Decimal to number
            gateInDate: c.gateInDate?.toISOString() || null,
            gateOutDate: c.gateOutDate?.toISOString() || null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
        }))
    };

    return <JobForm initialData={serializedJob} />;
}
