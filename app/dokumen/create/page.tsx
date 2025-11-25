import { getJobs } from '../actions';
import DokumenForm from '../_components/DokumenForm';

export default async function CreateDokumenPage() {
    const jobs = await getJobs();

    return <DokumenForm jobs={jobs} />;
}
