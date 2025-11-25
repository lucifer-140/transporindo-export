'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function createJob(formData: FormData) {
    console.log('Received FormData:', Object.fromEntries(formData));

    const rawFormData = {
        jobNo: formData.get('jobNo') as string,
        date: new Date(formData.get('date') as string),
        customer: formData.get('customer') as string,
        containerCount: Number(formData.get('containerCount')),
        origin: formData.get('origin') as string,
        destination: formData.get('destination') as string,
        forwardingAgent: formData.get('forwardingAgent') as string,
        shippingLine: formData.get('shippingLine') as string,
        vesselName: formData.get('vesselName') as string,
        voyageNo: formData.get('voyageNo') as string,
        eta: formData.get('eta') ? new Date(formData.get('eta') as string) : null,
        submissionNo: formData.get('submissionNo') as string,
        jobInvoiceNo: formData.get('jobInvoiceNo') as string,
        pebNo: formData.get('pebNo') as string,
        pebDate: formData.get('pebDate') ? new Date(formData.get('pebDate') as string) : null,
        commodity: formData.get('commodity') as string,
        remarks: formData.get('remarks') as string,
    };

    // Extract container data
    const containers = [];
    let i = 0;
    // Check for sequential indices
    while (formData.has(`containers[${i}].containerNo`)) {
        containers.push({
            containerNo: formData.get(`containers[${i}].containerNo`) as string,
            sizeType: formData.get(`containers[${i}].sizeType`) as string,
            sealNo: formData.get(`containers[${i}].sealNo`) as string,
            chassisNo: formData.get(`containers[${i}].chassisNo`) as string,
            transporterName: formData.get(`containers[${i}].transporterName`) as string,
            cost: formData.get(`containers[${i}].cost`) ? Number(formData.get(`containers[${i}].cost`)) : 0,
            location: formData.get(`containers[${i}].location`) as string,
            deliveryOrderNo: formData.get(`containers[${i}].deliveryOrderNo`) as string,
            gateInDate: formData.get(`containers[${i}].gateInDate`) ? new Date(formData.get(`containers[${i}].gateInDate`) as string) : null,
            gateOutDate: formData.get(`containers[${i}].gateOutDate`) ? new Date(formData.get(`containers[${i}].gateOutDate`) as string) : null,
        });
        i++;
    }

    console.log('Parsed Containers:', containers);

    try {
        await prisma.emklJob.create({
            data: {
                ...rawFormData,
                containers: {
                    create: containers
                }
            }
        });
        console.log('Job created successfully');
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to create job.');
    }

    revalidatePath('/emkl');
    redirect('/emkl');
}
