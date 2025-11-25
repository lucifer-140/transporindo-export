'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function createDokumen(formData: FormData) {
    const rawFormData = {
        receiptNo: formData.get('receiptNo') as string,
        receiptDate: new Date(formData.get('receiptDate') as string),
        docType: formData.get('docType') as string,
        description: formData.get('description') as string,
        docNo: formData.get('docNo') as string,
        jobId: parseInt(formData.get('jobId') as string),
        cost: parseFloat(formData.get('cost') as string),
        paymentType: formData.get('paymentType') as string || 'Cash', // Default to Cash if missing
    };

    await prisma.dokumen.create({
        data: rawFormData
    });

    revalidatePath('/dokumen');
    redirect('/dokumen');
}

export async function getDokumens() {
    return await prisma.dokumen.findMany({
        include: {
            job: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getDokumen(id: number) {
    return await prisma.dokumen.findUnique({
        where: { id },
        include: {
            job: true
        }
    });
}

export async function updateDokumen(id: number, formData: FormData) {
    const rawFormData = {
        receiptNo: formData.get('receiptNo') as string,
        receiptDate: new Date(formData.get('receiptDate') as string),
        docType: formData.get('docType') as string,
        description: formData.get('description') as string,
        docNo: formData.get('docNo') as string,
        jobId: parseInt(formData.get('jobId') as string),
        cost: parseFloat(formData.get('cost') as string),
        paymentType: formData.get('paymentType') as string || 'Cash',
    };

    await prisma.dokumen.update({
        where: { id },
        data: rawFormData
    });

    revalidatePath('/dokumen');
    redirect('/dokumen');
}

export async function searchJobs(query: string) {
    if (!query) return [];

    return await prisma.emklJob.findMany({
        where: {
            jobNo: {
                contains: query,
                mode: 'insensitive'
            }
        },
        take: 10,
        select: {
            id: true,
            jobNo: true,
            customer: true
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
