import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { MessageCircle, Calendar, FileText, Phone, Menu, X } from 'lucide-react';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';

export default function CustomerLayout() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Logo />

                        <nav className="hidden md:flex items-center space-x-6">
                            <Link
                                to="/chat"
                                className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors"
                            >
                                <MessageCircle className="h-4 w-4" />
                                <span>Chat</span>
                            </Link>
                            <Link
                                to="/availability"
                                className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors"
                            >
                                <Calendar className="h-4 w-4" />
                                <span>Rooms</span>
                            </Link>
                            <Link
                                to="/help"
                                className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors"
                            >
                                <FileText className="h-4 w-4" />
                                <span>Help</span>
                            </Link>
                            <Link
                                to="/emergency"
                                className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
                            >
                                <Phone className="h-4 w-4" />
                                <span>Emergency</span>
                            </Link>
                        </nav>

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((open) => !open)}
                            className="md:hidden text-gray-600 hover:text-gray-900"
                            aria-expanded={mobileMenuOpen}
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>

                    {mobileMenuOpen && (
                        <nav className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 md:hidden">
                            <Link
                                to="/chat"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center space-x-2 text-gray-600 hover:text-primary"
                            >
                                <MessageCircle className="h-4 w-4" />
                                <span>Chat</span>
                            </Link>
                            <Link
                                to="/availability"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center space-x-2 text-gray-600 hover:text-primary"
                            >
                                <Calendar className="h-4 w-4" />
                                <span>Rooms</span>
                            </Link>
                            <Link
                                to="/help"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center space-x-2 text-gray-600 hover:text-primary"
                            >
                                <FileText className="h-4 w-4" />
                                <span>Help</span>
                            </Link>
                            <Link
                                to="/emergency"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                            >
                                <Phone className="h-4 w-4" />
                                <span>Emergency</span>
                            </Link>
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
