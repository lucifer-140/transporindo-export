'use client';

import { useState, useEffect, useRef } from 'react';
import { getCustomers } from '../app/settings/customers/actions';

interface Customer {
    id: number;
    code: string;
    name: string;
}

interface CustomerSelectProps {
    name: string;
    defaultValue?: string;
    required?: boolean;
    onChange?: (value: string) => void;
}

export default function CustomerSelect({ name, defaultValue, required, onChange }: CustomerSelectProps) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(defaultValue || '');
    const [selected, setSelected] = useState(defaultValue || '');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        getCustomers().then(setCustomers);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const filteredCustomers = customers.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (customer: Customer) => {
        const value = `${customer.code} - ${customer.name}`;
        setSearch(value);
        setSelected(value);
        setIsOpen(false);
        if (onChange) onChange(value);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setSelected(e.target.value); // Allow custom input if needed, or force selection? User said "searchable", implies selection. But maybe free text allowed?
        // Let's allow free text for now to be safe, but the goal is to pick from list.
        setIsOpen(true);
        if (onChange) onChange(e.target.value);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                name={name}
                required={required}
                value={search}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border"
                placeholder="Search by code or name..."
                autoComplete="off"
            />
            {isOpen && filteredCustomers.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {filteredCustomers.map((customer) => (
                        <li
                            key={customer.id}
                            className="relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-blue-100 text-slate-900"
                            onClick={() => handleSelect(customer)}
                        >
                            <span className="block truncate">
                                <span className="font-semibold">{customer.code}</span> - {customer.name}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
