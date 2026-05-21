import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Hotel, MessageCircle, Calendar, FileText, Phone, Menu, X } from 'lucide-react';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';

const navItems = [
    { to: '/chat', label: 'Chat', icon: MessageCircle },
    { to: '/availability', label: 'Rooms', icon: Calendar },
    { to: '/help', label: 'Help', icon: FileText },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200',
        isActive
            ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200/80'
            : 'text-gray-500 hover:bg-white/70 hover:text-gray-900'
    );

export default function CustomerLayout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
                <div className="container mx-auto px-4">
                    <div className="flex h-16 items-center justify-between">
                        <Link
                            to="/"
                            className="group flex items-center gap-2.5 rounded-lg outline-none ring-primary/20 transition focus-visible:ring-2"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                                <Hotel className="h-5 w-5 text-primary" />
                            </span>
                            <span className="text-lg font-semibold tracking-tight text-gray-900">
                                Grand Hotel
                            </span>
                        </Link>

                        <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
                            <div className="flex items-center gap-0.5 rounded-full border border-gray-200/70 bg-gray-50/80 p-1">
                                {navItems.map(({ to, label, icon: Icon }) => (
                                    <NavLink key={to} to={to} className={navLinkClass}>
                                        <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                                        <span>{label}</span>
                                    </NavLink>
                                ))}
                            </div>
                            <NavLink
                                to="/emergency"
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-red-600 text-white shadow-sm shadow-red-600/25'
                                            : 'border border-red-200/80 bg-red-50/80 text-red-600 hover:border-red-300 hover:bg-red-100'
                                    )
                                }
                            >
                                <Phone className="h-4 w-4 shrink-0 stroke-[1.75]" />
                                <span>Emergency</span>
                            </NavLink>
                        </nav>

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200/80 bg-gray-50/80 text-gray-600 transition hover:bg-gray-100 md:hidden"
                            aria-expanded={mobileMenuOpen}
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>

                    {mobileMenuOpen && (
                        <nav
                            className="border-t border-gray-100 py-3 md:hidden"
                            aria-label="Mobile navigation"
                        >
                            <div className="flex flex-col gap-1">
                                {navItems.map(({ to, label, icon: Icon }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={({ isActive }) =>
                                            cn(
                                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            )
                                        }
                                    >
                                        <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" />
                                        <span>{label}</span>
                                    </NavLink>
                                ))}
                                <NavLink
                                    to="/emergency"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        cn(
                                            'mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-red-600 text-white'
                                                : 'text-red-600 hover:bg-red-50'
                                        )
                                    }
                                >
                                    <Phone className="h-4 w-4 shrink-0 stroke-[1.75]" />
                                    <span>Emergency</span>
                                </NavLink>
                            </div>
                        </nav>
                    )}
                </div>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
