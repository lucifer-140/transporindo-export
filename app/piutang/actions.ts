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

export async function updatePiutang(id: number, formData: FormData) {
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

    await prisma.piutang.update({
        where: { id },
        data: rawFormData
    });

    revalidatePath('/piutang');
    redirect('/piutang');
}

export async function getPiutang(id: number) {
    return await prisma.piutang.findUnique({
        where: { id },
        include: {
            invoice: true
        }
    });
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

export async function searchInvoices(query: string) {
    if (!query) return [];

    const invoices = await prisma.invoice.findMany({
        where: {
            customer: {
                contains: query,
                mode: 'insensitive'
            }
        },
        include: {
            items: true,
            piutangs: true // Include piutangs to calculate paid amount
        },
        take: 10,
        orderBy: {
            createdAt: 'desc'
        }
    });

    return invoices.map(inv => ({
        ...inv,
        date: inv.date.toISOString(),
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
        items: inv.items.map(item => ({
            ...item,
            date: item.date?.toISOString() || null,
            price: Number(item.price),
            total: Number(item.total),
            dpp: item.dpp ? Number(item.dpp) : null,
            ppn: item.ppn ? Number(item.ppn) : null,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
        })),
        piutangs: inv.piutangs.map(p => ({
            ...p,
            date: p.date.toISOString(),
            giroDate: p.giroDate?.toISOString() || null,
            nominal: Number(p.nominal),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        }))
    }));
}
