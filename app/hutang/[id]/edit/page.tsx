import HutangForm from '../../_components/HutangForm';
import { getHutang } from '../../actions';
import { notFound } from 'next/navigation';

export default async function EditHutangPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const hutang = await getHutang(parseInt(id));

    if (!hutang) {
        notFound();
    }

    // getHutang already returns serialized data suitable for client component
    // We just need to ensure it matches what HutangForm expects
    const serializedHutang = {
        ...hutang,
        // items are already serialized in getHutang
    };

    return <HutangForm initialData={serializedHutang} />;
}
