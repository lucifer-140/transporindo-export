'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function createDokumen(formData: FormData) {
    const rawFormData = {
        receiptNo: formData.get('receiptNo') as string,
        spDate: new Date(formData.get('spDate') as string),
        docType: formData.get('docType') as string,
        containerNo: formData.get('containerNo') as string,
        docNo: formData.get('docNo') as string,
        jobId: parseInt(formData.get('jobId') as string),
        cost: parseFloat(formData.get('cost') as string),
        paymentType: formData.get('paymentType') as string,
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
