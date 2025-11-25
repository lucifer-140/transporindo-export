'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function createPiutang(formData: FormData) {
    const rawFormData = {
        noPiutang: formData.get('noPiutang') as string,
        date: new Date(formData.get('date') as string),
        paymentType: formData.get('paymentType') as string,
        giroNo: formData.get('giroNo') as string || null,
        giroDate: formData.get('giroDate') ? new Date(formData.get('giroDate') as string) : null,
        nominal: parseFloat(formData.get('nominal') as string),
        kodePerkiraan: formData.get('kodePerkiraan') as string,
        namaPerkiraan: formData.get('namaPerkiraan') as string,
        invoiceId: parseInt(formData.get('invoiceId') as string),
    };

    await prisma.piutang.create({
        data: rawFormData
    });

    revalidatePath('/piutang');
    redirect('/piutang');
}

export async function getPiutangs() {
    return await prisma.piutang.findMany({
        include: {
            invoice: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function searchInvoices(customerName?: string) {
    const whereClause: any = {};
    if (customerName) {
        whereClause.customer = {
            contains: customerName,
            mode: 'insensitive'
        };
    }

    return await prisma.invoice.findMany({
        where: whereClause,
        include: {
            items: true // To calculate total bon
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 50
    });
}
