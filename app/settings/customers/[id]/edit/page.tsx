import CustomerForm from '../../_components/CustomerForm';
import { getCustomer } from '../../actions';
import { notFound } from 'next/navigation';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const customer = await getCustomer(parseInt(id));

    if (!customer) {
        notFound();
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <CustomerForm initialData={customer} />
        </div>
    );
}
