import { useData } from '@/context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { mockActivity } from '@/data/mockData';
import { formatDateTime } from '@/lib/utils';

export default function Dashboard() {
    const { bookings, complaints, emergencies } = useData();

    const todayBookings = bookings.filter((b) => {
        const checkIn = new Date(b.checkIn);
        const today = new Date();
        return (
            checkIn.toDateString() === today.toDateString() ||
            b.createdAt.split('T')[0] === today.toISOString().split('T')[0]
        );
    }).length;

    const activeEmergencies = emergencies.filter((e) => e.status !== 'Resolved').length;
    const newComplaints = complaints.filter((c) => c.status === 'New').length;
    const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed').length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Today's Bookings
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{todayBookings}</div>
                        <p className="text-xs text-gray-500 mt-1">New reservations today</p>
                    </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-900">
                            Active Emergencies
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-700">{activeEmergencies}</div>
                        <p className="text-xs text-red-600 mt-1">Require immediate attention</p>
                    </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-900">
                            New Complaints
                        </CardTitle>
                        <FileText className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-700">{newComplaints}</div>
                        <p className="text-xs text-yellow-600 mt-1">Awaiting review</p>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-900">
                            Confirmed Bookings
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">{confirmedBookings}</div>
                        <p className="text-xs text-green-600 mt-1">Total confirmed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {mockActivity.slice(0, 10).map((activity) => (
                            <div key={activity.id} className="flex items-start justify-between border-b pb-3 last:border-0">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatDateTime(activity.timestamp)}
                                    </p>
                                </div>
                                {activity.status && (
                                    <Badge
                                        variant={
                                            activity.status === 'Confirmed' || activity.status === 'Resolved'
                                                ? 'success'
                                                : activity.status === 'New'
                                                    ? 'destructive'
                                                    : 'warning'
                                        }
                                        className="ml-3"
                                    >
                                        {activity.status}
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
