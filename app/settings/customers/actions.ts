'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function getCustomers(query?: string) {
    if (query) {
        return prisma.customer.findMany({
            where: {
                OR: [
                    { code: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: { name: 'asc' },
        });
    }
    return prisma.customer.findMany({
        orderBy: { name: 'asc' },
    });
}

export async function getCustomer(id: number) {
    return prisma.customer.findUnique({
        where: { id },
    });
}

export async function createCustomer(formData: FormData) {
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;

    await prisma.customer.create({
        data: {
            code,
            name,
        },
    });

    revalidatePath('/settings/customers');
    redirect('/settings/customers');
}

export async function updateCustomer(id: number, formData: FormData) {
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;

    await prisma.customer.update({
        where: { id },
        data: {
            code,
            name,
        },
    });

    revalidatePath('/settings/customers');
    redirect('/settings/customers');
}

export async function deleteCustomer(id: number) {
    await prisma.customer.delete({
        where: { id },
    });

    revalidatePath('/settings/customers');
}
