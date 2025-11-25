'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function createInvoice(formData: FormData) {
    const rawFormData = {
        invoiceNo: formData.get('invoiceNo') as string,
        date: new Date(formData.get('date') as string),
        jobId: parseInt(formData.get('jobId') as string),
        customer: formData.get('customer') as string,
        destination: formData.get('destination') as string,
        commodity: formData.get('commodity') as string,
        vessel: formData.get('vessel') as string,
        voyageNo: formData.get('voyageNo') as string,
        paymentType: formData.get('paymentType') as string,
    };

    const itemsJSON = formData.get('items') as string;
    const items = itemsJSON ? JSON.parse(itemsJSON) : [];

    await prisma.invoice.create({
        data: {
            ...rawFormData,
            items: {
                create: items.map((item: any) => ({
                    type: item.type,
                    description: item.description,
                    qty: parseInt(item.qty),
                    price: parseFloat(item.price),
                    total: parseFloat(item.total),
                    date: item.date ? new Date(item.date) : null,
                    dpp: item.dpp ? parseFloat(item.dpp) : null,
                    ppn: item.ppn ? parseFloat(item.ppn) : null,
                }))
            }
        }
    });

    revalidatePath('/invoice');
    redirect('/invoice');
}

export async function getInvoices() {
    return await prisma.invoice.findMany({
        include: {
            job: true,
            items: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getJobDetails(jobId: number) {
    return await prisma.emklJob.findUnique({
        where: { id: jobId },
        select: {
            customer: true,
            destination: true,
            commodity: true,
            vesselName: true,
            voyageNo: true
        }
    });
}

export async function getJobs() {
    return await prisma.emklJob.findMany({
        take: 50,
        orderBy: {
            createdAt: 'desc'
        },
        select: {
            id: true,
            jobNo: true,
            customer: true
        }
    });
}
