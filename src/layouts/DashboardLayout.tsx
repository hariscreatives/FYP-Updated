'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { LOGO_NO_BG_SRC } from '@/constants/logos';
import {
    Hotel,
    LayoutDashboard,
    Calendar,
    FileText,
    AlertCircle,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    ShieldAlert,
    Siren,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const { emergencies } = useData();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // ✅ Count only NEW (unacknowledged) emergencies
    const newEmergencyCount = emergencies.filter((e) => e.status === 'New').length;
    const hasNewEmergency = newEmergencyCount > 0;

    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false);
        logout();
        router.push('/staff/login');
    };

    const handleLogoutCancel = () => {
        setShowLogoutConfirm(false);
    };

    const navItems = [
        { name: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
        { name: 'Bookings', path: '/staff/bookings', icon: Calendar },
        { name: 'Availability', path: '/staff/availability', icon: Hotel },
        { name: 'Complaints', path: '/staff/complaints', icon: FileText },
        { name: 'Emergencies', path: '/staff/emergencies', icon: AlertCircle },
        { name: 'Staff', path: '/staff/staff-management', icon: Users },
        { name: 'Analytics', path: '/staff/analytics', icon: BarChart3 },
        { name: 'Settings', path: '/staff/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-100 font-sans">

            {/* ✅ BLINKING RED EMERGENCY BANNER — shows at very top when emergency is active */}
            {hasNewEmergency && (
                <div
                    className="w-full z-50 flex items-center justify-between px-4 py-2 cursor-pointer"
                    style={{
                        background: 'linear-gradient(90deg, #dc2626, #991b1b, #dc2626)',
                        backgroundSize: '200% 100%',
                        animation: 'emergencyPulse 1s ease-in-out infinite',
                    }}
                    onClick={() => router.push('/staff/emergencies')}
                >
                    <style>{`
                        @keyframes emergencyPulse {
                            0%, 100% { opacity: 1; background-position: 0% 50%; }
                            50% { opacity: 0.75; background-position: 100% 50%; }
                        }
                        @keyframes blink {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0; }
                        }
                    `}</style>
                    <div className="flex items-center space-x-3">
                        {/* Blinking red light dot */}
                        <span
                            className="inline-block w-4 h-4 rounded-full bg-white"
                            style={{ animation: 'blink 0.6s step-start infinite' }}
                        />
                        <Siren className="h-5 w-5 text-white" />
                        <span className="text-white font-bold text-sm tracking-wide uppercase">
                            🚨 {newEmergencyCount} ACTIVE EMERGENCY{newEmergencyCount > 1 ? 'IES' : ''} — IMMEDIATE ATTENTION REQUIRED
                        </span>
                    </div>
                    <span className="text-white text-xs font-semibold underline">
                        View Now →
                    </span>
                </div>
            )}

            {/* Top Header */}
            <header className="bg-white border-b h-[6rem] flex items-center justify-between px-4 sticky top-0 z-30">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden"
                    >
                        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    <img src={LOGO_NO_BG_SRC} alt="Grand Hotel" className="h-[96px] w-auto object-contain" />
                    <h1 className="text-xl font-bold hidden sm:block">Grand Hotel Management</h1>
                </div>
                <div className="flex items-center space-x-4">

                    {/* ✅ Emergency bell icon in header with blinking red dot */}
                    {hasNewEmergency && (
                        <Link href="/staff/emergencies">
                            <div className="relative cursor-pointer">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                                <span
                                    className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-600 rounded-full"
                                    style={{ animation: 'blink 0.8s step-start infinite' }}
                                >
                                    {newEmergencyCount}
                                </span>
                            </div>
                        </Link>
                    )}

                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.role}</p>
                    </div>
                    <Button onClick={handleLogoutClick} variant="outline" size="sm">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside
                    className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:sticky top-[6rem] left-0 h-[calc(100vh-6rem)]
            w-64 bg-white border-r transition-transform duration-300 z-20
            overflow-y-auto
          `}
                >
                    <nav className="p-4 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path;
                            const isEmergencyItem = item.path === '/staff/emergencies';

                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                    flex items-center justify-between px-4 py-3 rounded-lg transition-colors
                    ${isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : isEmergencyItem && hasNewEmergency
                                                ? 'bg-red-50 text-red-700 border border-red-200'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }
                  `}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Icon className={`h-5 w-5 ${isEmergencyItem && hasNewEmergency && !isActive ? 'text-red-600' : ''}`} />
                                        <span className="font-medium">{item.name}</span>
                                    </div>

                                    {/* ✅ Blinking red badge on Emergencies sidebar item */}
                                    {isEmergencyItem && hasNewEmergency && (
                                        <span
                                            className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full"
                                            style={{ animation: 'blink 0.8s step-start infinite' }}
                                        >
                                            {newEmergencyCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-10 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Logout Confirmation Dialog */}
            {showLogoutConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #070f33ee 0%, #172554ee 50%, #1e1b4bee 100%)' }}
                >
                    {/* Click outside to cancel */}
                    <div className="absolute inset-0" onClick={handleLogoutCancel} />

                    {/* Dialog */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Top accent bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900" />

                        <div className="p-7">
                            {/* Icon */}
                            <div className="flex justify-center mb-5">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 ring-8 ring-slate-50">
                                    <ShieldAlert className="h-8 w-8 text-slate-700" />
                                </div>
                            </div>

                            {/* Text */}
                            <div className="text-center mb-7">
                                <h2 className="text-xl font-bold text-gray-900 mb-2">
                                    Sign Out?
                                </h2>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Are you sure you want to log out of the admin panel?
                                    You'll need to sign in again to access the dashboard.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleLogoutCancel}
                                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogoutConfirm}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-slate-700 hover:to-slate-800 hover:shadow-lg flex items-center justify-center gap-2"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Yes, Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}