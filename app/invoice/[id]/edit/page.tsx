import { getInvoice } from '../../actions';
import InvoiceForm from '../../_components/InvoiceForm';
import { notFound } from 'next/navigation';

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const invoice = await getInvoice(parseInt(id));

    if (!invoice) {
        notFound();
    }

    const serializedInvoice = {
        ...invoice,
        date: invoice.date.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
        job: {
            ...invoice.job,
            date: invoice.job.date.toISOString(),
            eta: invoice.job.eta?.toISOString() || null,
            pebDate: invoice.job.pebDate?.toISOString() || null,
            createdAt: invoice.job.createdAt.toISOString(),
            updatedAt: invoice.job.updatedAt.toISOString(),
        },
        items: invoice.items.map(item => ({
            ...item,
            date: item.date?.toISOString() || null,
            price: Number(item.price),
            total: Number(item.total),
            dpp: item.dpp ? Number(item.dpp) : null,
            ppn: item.ppn ? Number(item.ppn) : null,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        }))
    };

    return <InvoiceForm initialData={serializedInvoice} />;
}
