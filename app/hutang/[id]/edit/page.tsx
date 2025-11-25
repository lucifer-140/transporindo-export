import HutangForm from '../../_components/HutangForm';
import { getHutang } from '../../actions';
import { notFound } from 'next/navigation';

export default async function EditHutangPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const hutang = await getHutang(parseInt(id));

    if (!hutang) {
        notFound();
    }

    const serializedHutang = {
        id: hutang.id,
        noHutang: hutang.noHutang,
        date: hutang.date.toISOString(),
        paymentType: hutang.paymentType,
        giroNo: hutang.giroNo,
        giroDate: hutang.giroDate?.toISOString() || null,
        nominal: Number(hutang.nominal),
        kodePerkiraan: hutang.kodePerkiraan,
        namaPerkiraan: hutang.namaPerkiraan,
        dokumenId: hutang.dokumenId,
        dokumen: {
            id: hutang.dokumen.id,
            receiptNo: hutang.dokumen.receiptNo,
            receiptDate: hutang.dokumen.receiptDate.toISOString(),
            docType: hutang.dokumen.docType,
            description: hutang.dokumen.description,
            transporterName: hutang.dokumen.transporterName,
            docNo: hutang.dokumen.docNo,
            jobId: hutang.dokumen.jobId,
            cost: Number(hutang.dokumen.cost),
            paymentType: hutang.dokumen.paymentType,
        }
    };

    return <HutangForm initialData={serializedHutang} />;
}
