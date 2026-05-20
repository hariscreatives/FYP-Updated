import { Link, Outlet } from 'react-router-dom';
import { Hotel, MessageCircle, Calendar, FileText, Phone } from 'lucide-react';
import Footer from '@/components/Footer';

export default function CustomerLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
            <header className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2">
                            <Hotel className="h-8 w-8 text-primary" />
                            <span className="text-2xl font-bold text-gray-900">Grand Hotel</span>
                        </Link>
                        <nav className="hidden md:flex space-x-6">
                            <Link to="/chat" className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors">
                                <MessageCircle className="h-4 w-4" />
                                <span>Chat</span>
                            </Link>
                            <Link to="/availability" className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors">
                                <Calendar className="h-4 w-4" />
                                <span>Rooms</span>
                            </Link>
                            <Link to="/help" className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors">
                                <FileText className="h-4 w-4" />
                                <span>Help</span>
                            </Link>
                            <Link to="/emergency" className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors">
                                <Phone className="h-4 w-4" />
                                <span>Emergency</span>
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
