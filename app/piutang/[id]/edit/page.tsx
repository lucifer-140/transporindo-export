import PiutangForm from '../../_components/PiutangForm';
import { getPiutang } from '../../actions';
import { notFound } from 'next/navigation';

export default async function EditPiutangPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const piutang = await getPiutang(parseInt(id));

    if (!piutang) {
        notFound();
    }

    const serializedPiutang = {
        id: piutang.id,
        noPiutang: piutang.noPiutang,
        date: piutang.date.toISOString(),
        paymentType: piutang.paymentType,
        giroNo: piutang.giroNo,
        giroDate: piutang.giroDate?.toISOString() || null,
        nominal: Number(piutang.nominal),
        kodePerkiraan: piutang.kodePerkiraan,
        namaPerkiraan: piutang.namaPerkiraan,
        invoiceId: piutang.invoiceId,
        invoice: {
            id: piutang.invoice.id,
            invoiceNo: piutang.invoice.invoiceNo,
            date: piutang.invoice.date.toISOString(),
            customer: piutang.invoice.customer,
            destination: piutang.invoice.destination,
            commodity: piutang.invoice.commodity,
            vessel: piutang.invoice.vessel,
            voyageNo: piutang.invoice.voyageNo,
            paymentType: piutang.invoice.paymentType,
        }
    };

    return <PiutangForm initialData={serializedPiutang} />;
}
