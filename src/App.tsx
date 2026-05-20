import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import CustomerLayout from '@/layouts/CustomerLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

const Landing = lazy(() => import('@/pages/customer/Landing'));
const Chat = lazy(() => import('@/pages/customer/Chat'));
const Availability = lazy(() => import('@/pages/customer/Availability'));
const Booking = lazy(() => import('@/pages/customer/Booking'));
const BookingConfirmation = lazy(() => import('@/pages/customer/BookingConfirmation'));
const Complaint = lazy(() => import('@/pages/customer/Complaint'));
const Emergency = lazy(() => import('@/pages/customer/Emergency'));
const Feedback = lazy(() => import('@/pages/customer/Feedback'));
const Help = lazy(() => import('@/pages/customer/Help'));

const Login = lazy(() => import('@/pages/staff/Login'));
const Dashboard = lazy(() => import('@/pages/staff/Dashboard'));
const BookingsList = lazy(() => import('@/pages/staff/BookingsList'));
const BookingDetails = lazy(() => import('@/pages/staff/BookingDetails'));
const AvailabilityManagement = lazy(() => import('@/pages/staff/AvailabilityManagement'));
const ComplaintsList = lazy(() => import('@/pages/staff/ComplaintsList'));
const ComplaintDetails = lazy(() => import('@/pages/staff/ComplaintDetails'));
const EmergenciesList = lazy(() => import('@/pages/staff/EmergenciesList'));
const EmergencyDetails = lazy(() => import('@/pages/staff/EmergencyDetails'));
const StaffManagement = lazy(() => import('@/pages/staff/StaffManagement'));
const Analytics = lazy(() => import('@/pages/staff/Analytics'));
const Settings = lazy(() => import('@/pages/staff/Settings'));

function PageLoader() {
    return (
        <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/staff/login" replace />;
}

export default function App() {
    return (
        <Suspense fallback={<PageLoader />}>
            <Routes>
                {/* Customer Routes */}
                <Route path="/" element={<CustomerLayout />}>
                    <Route index element={<Landing />} />
                    <Route path="chat" element={<Chat />} />
                    <Route path="availability" element={<Availability />} />
                    <Route path="booking" element={<Booking />} />
                    <Route path="booking-confirmation/:bookingId" element={<BookingConfirmation />} />
                    <Route path="complaint" element={<Complaint />} />
                    <Route path="emergency" element={<Emergency />} />
                    <Route path="feedback" element={<Feedback />} />
                    <Route path="help" element={<Help />} />
                </Route>

                {/* Staff Login */}
                <Route path="/staff/login" element={<Login />} />

                {/* Staff Dashboard Routes (Protected) */}
                <Route
                    path="/staff"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/staff/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="bookings" element={<BookingsList />} />
                    <Route path="bookings/:bookingId" element={<BookingDetails />} />
                    <Route path="availability" element={<AvailabilityManagement />} />
                    <Route path="complaints" element={<ComplaintsList />} />
                    <Route path="complaints/:complaintId" element={<ComplaintDetails />} />
                    <Route path="emergencies" element={<EmergenciesList />} />
                    <Route path="emergencies/:emergencyId" element={<EmergencyDetails />} />
                    <Route path="staff-management" element={<StaffManagement />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="settings" element={<Settings />} />
                </Route>

                {/* 404 Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
