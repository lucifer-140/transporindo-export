'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function createHutang(formData: FormData) {
    const rawFormData = {
        noHutang: formData.get('noHutang') as string,
        date: new Date(formData.get('date') as string),
        paymentType: formData.get('paymentType') as string,
        giroNo: formData.get('giroNo') as string || null,
        giroDate: formData.get('giroDate') ? new Date(formData.get('giroDate') as string) : null,
        nominal: parseFloat(formData.get('nominal') as string),
        kodePerkiraan: formData.get('kodePerkiraan') as string,
        namaPerkiraan: formData.get('namaPerkiraan') as string,
        dokumenId: parseInt(formData.get('dokumenId') as string),
    };

    await prisma.hutang.create({
        data: rawFormData
    });

    revalidatePath('/hutang');
    redirect('/hutang');
}

export async function getHutangs() {
    return await prisma.hutang.findMany({
        include: {
            dokumen: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getDokumensForHutang(filterType?: string, filterValue?: string) {
    const whereClause: any = {};
    if (filterType === 'docType' && filterValue) {
        whereClause.docType = filterValue;
    }
    // Note: transporterName is not in Dokumen model based on current schema, 
    // assuming it might be 'description' or part of a future update. 
    // For now, filtering by docType as requested.

    return await prisma.dokumen.findMany({
        where: whereClause,
        orderBy: {
            createdAt: 'desc'
        }
    });
}
