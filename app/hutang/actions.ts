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

export async function updateHutang(id: number, formData: FormData) {
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

    await prisma.hutang.update({
        where: { id },
        data: rawFormData
    });

    revalidatePath('/hutang');
    redirect('/hutang');
}

export async function getHutang(id: number) {
    return await prisma.hutang.findUnique({
        where: { id },
        include: {
            dokumen: true
        }
    });
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
    if (filterValue) {
        if (filterType === 'docType') {
            whereClause.docType = { contains: filterValue, mode: 'insensitive' };
        } else if (filterType === 'transporterName') {
            whereClause.transporterName = { contains: filterValue, mode: 'insensitive' };
        }
    }

    const dokumens = await prisma.dokumen.findMany({
        where: whereClause,
        include: {
            hutangs: true // Include hutangs to calculate paid amount
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return dokumens.map(doc => ({
        ...doc,
        receiptDate: doc.receiptDate.toISOString(),
        cost: Number(doc.cost),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        hutangs: doc.hutangs.map(h => ({
            ...h,
            date: h.date.toISOString(),
            giroDate: h.giroDate?.toISOString() || null,
            nominal: Number(h.nominal),
            createdAt: h.createdAt.toISOString(),
            updatedAt: h.updatedAt.toISOString(),
        }))
    }));
}
