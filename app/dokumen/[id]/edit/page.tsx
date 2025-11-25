import { getDokumen, getJobs } from '../../actions';
import DokumenForm from '../../_components/DokumenForm';
import { notFound } from 'next/navigation';

export default async function EditDokumenPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const dokumen = await getDokumen(parseInt(id));
    const jobs = await getJobs();

    if (!dokumen) {
        notFound();
    }

    // Serialize dates and decimals
    const serializedDokumen = {
        ...dokumen,
        receiptDate: dokumen.receiptDate.toISOString(),
        createdAt: dokumen.createdAt.toISOString(),
        updatedAt: dokumen.updatedAt.toISOString(),
        cost: Number(dokumen.cost), // Convert Decimal to number
        job: {
            ...dokumen.job,
            date: dokumen.job.date.toISOString(),
            eta: dokumen.job.eta?.toISOString() || null,
            pebDate: dokumen.job.pebDate?.toISOString() || null,
            createdAt: dokumen.job.createdAt.toISOString(),
            updatedAt: dokumen.job.updatedAt.toISOString(),
        }
    };

    return <DokumenForm initialData={serializedDokumen} jobs={jobs} />;
}
