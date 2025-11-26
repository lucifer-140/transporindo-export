'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
    id: number;
    deleteAction: (id: number) => Promise<void>;
}

export default function DeleteButton({ id, deleteAction }: DeleteButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this item?')) {
            startTransition(async () => {
                await deleteAction(id);
            });
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50"
            title="Delete"
        >
            <Trash2 className="h-4 w-4" />
        </button>
    );
}
