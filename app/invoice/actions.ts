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

export async function getInvoice(id: number) {
    return await prisma.invoice.findUnique({
        where: { id },
        include: {
            job: true,
            items: true
        }
    });
}

export async function updateInvoice(id: number, formData: FormData) {
    const rawFormData = {
        jobId: parseInt(formData.get('jobId') as string),
        invoiceNo: formData.get('invoiceNo') as string,
        date: new Date(formData.get('date') as string),
        customer: formData.get('customer') as string,
        destination: formData.get('destination') as string,
        commodity: formData.get('commodity') as string,
        vessel: formData.get('vessel') as string,
        voyageNo: formData.get('voyageNo') as string,
        paymentType: formData.get('paymentType') as string,
    };

    // Parse items from JSON string
    const itemsJSON = formData.get('items') as string;
    const items = itemsJSON ? JSON.parse(itemsJSON) : [];

    // Map items to correct format if needed (though JSON.parse should be enough if the structure matches)
    const formattedItems = items.map((item: any) => ({
        type: item.type,
        description: item.description,
        qty: parseInt(item.qty),
        price: parseFloat(item.price),
        total: parseFloat(item.total),
        date: item.date ? new Date(item.date) : null,
        dpp: item.dpp ? parseFloat(item.dpp) : null,
        ppn: item.ppn ? parseFloat(item.ppn) : null,
    }));

    await prisma.$transaction(async (tx) => {
        // 1. Update Invoice details
        await tx.invoice.update({
            where: { id },
            data: rawFormData
        });

        // 2. Delete existing items
        await tx.invoiceItem.deleteMany({
            where: { invoiceId: id }
        });

        // 3. Create new items
        if (formattedItems.length > 0) {
            await tx.invoiceItem.createMany({
                data: formattedItems.map((item: any) => ({ ...item, invoiceId: id }))
            });
        }
    });

    revalidatePath('/invoice');
    redirect('/invoice');
}

export async function deleteInvoice(id: number) {
    await prisma.invoice.delete({
        where: { id }
    });
    revalidatePath('/invoice');
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
