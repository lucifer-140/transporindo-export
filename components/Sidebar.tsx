'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Settings, FileText, FileSpreadsheet, CreditCard, Wallet } from 'lucide-react';
import { clsx } from 'clsx';

interface NavigationItem {
    name: string;
    href: string;
    icon?: any;
    children?: { name: string; href: string }[];
}

const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'EMKL (Logistics)', href: '/emkl', icon: Truck },
    { name: 'Dokumen', href: '/dokumen', icon: FileText },
    { name: 'Invoice', href: '/invoice', icon: FileSpreadsheet },
    { name: 'Hutang', href: '/hutang', icon: CreditCard },
    { name: 'Piutang', href: '/piutang', icon: Wallet },
    {
        name: 'Settings',
        href: '#',
        icon: Settings,
        children: [
            { name: 'Customers', href: '/settings/customers' },
        ]
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const toggleDropdown = (name: string) => {
        setOpenDropdown(openDropdown === name ? null : name);
    };

    return (
        <div className="flex h-screen w-64 flex-col bg-slate-900 text-white">
            <div className="flex h-16 items-center justify-center border-b border-slate-800">
                <h1 className="text-xl font-bold">Office System</h1>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href));
                    const isDropdownOpen = openDropdown === item.name || isActive;

                    if (item.children) {
                        return (
                            <div key={item.name}>
                                <button
                                    onClick={() => toggleDropdown(item.name)}
                                    className={clsx(
                                        'group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium transition-colors justify-between',
                                        isActive
                                            ? 'bg-slate-800 text-white'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    )}
                                >
                                    <div className="flex items-center">
                                        <item.icon
                                            className={clsx(
                                                'mr-3 h-6 w-6 flex-shrink-0',
                                                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                                            )}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </div>
                                    <svg
                                        className={clsx(
                                            'ml-2 h-5 w-5 transform transition-transform duration-150',
                                            isDropdownOpen ? 'rotate-180 text-gray-400' : 'text-gray-300'
                                        )}
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                                {isDropdownOpen && (
                                    <div className="space-y-1 pl-11">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.name}
                                                href={child.href}
                                                className={clsx(
                                                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                                                    pathname === child.href
                                                        ? 'bg-slate-800 text-white'
                                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                )}
                                            >
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    'mr-3 h-6 w-6 flex-shrink-0',
                                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
