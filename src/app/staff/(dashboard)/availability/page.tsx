'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    startOfDay,
    startOfMonth,
    endOfMonth,
    getDay,
    addDays,
    addMonths,
    subMonths,
    format,
    isSameDay,
    isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, BedDouble, Users, Calendar, Hotel } from 'lucide-react';

export default function AvailabilityManagement() {
    const { rooms, bookings } = useData();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showPopup, setShowPopup] = useState(false);

    const today = startOfDay(new Date());
    const firstDayOfMonth = startOfMonth(currentMonth);
    const daysInMonth = endOfMonth(currentMonth).getDate();
    const startingDayOfWeek = getDay(firstDayOfMonth);

    // Build calendar grid (6 rows × 7 cols = 42 cells)
    const calendarDays = useMemo(() => {
        return Array.from({ length: 42 }, (_, i) => {
            const dayNumber = i - startingDayOfWeek + 1;
            if (dayNumber > 0 && dayNumber <= daysInMonth) {
                const date = addDays(firstDayOfMonth, dayNumber - 1);
                const occupiedCount = bookings.filter(b => {
                    const checkIn = startOfDay(new Date(b.checkIn));
                    const checkOut = startOfDay(new Date(b.checkOut));
                    return date >= checkIn && date < checkOut &&
                        (b.status === 'Confirmed' || b.status === 'Completed');
                }).length;
                const occupancyPct = rooms.length > 0 ? occupiedCount / rooms.length : 0;
                return { date, dayNumber, occupiedCount, occupancyPct, isValid: true };
            }
            return { isValid: false };
        });
    }, [currentMonth, bookings, rooms, firstDayOfMonth, startingDayOfWeek, daysInMonth]);

    // Per-room availability for selected date
    const roomAvailabilityForDate = useMemo(() => {
        if (!selectedDate) return [];
        return rooms.map(room => {
            const booking = bookings.find(b => {
                const checkIn = startOfDay(new Date(b.checkIn));
                const checkOut = startOfDay(new Date(b.checkOut));
                return b.roomId === room.id &&
                    selectedDate >= checkIn && selectedDate < checkOut &&
                    (b.status === 'Confirmed' || b.status === 'Completed');
            });
            return { room, booking: booking || null, isOccupied: !!booking };
        });
    }, [selectedDate, rooms, bookings]);

    const availableCount = roomAvailabilityForDate.filter(r => !r.isOccupied).length;
    const occupiedCount  = roomAvailabilityForDate.filter(r => r.isOccupied).length;

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setShowPopup(true);
    };

    // Today's occupancy for stats
    const todayOccupied = bookings.filter(b => {
        const ci = startOfDay(new Date(b.checkIn));
        const co = startOfDay(new Date(b.checkOut));
        return today >= ci && today < co && (b.status === 'Confirmed' || b.status === 'Completed');
    }).length;
    const todayAvailable = rooms.length - todayOccupied;

    // Color scheme per occupancy level — light theme
    const getCellStyle = (pct: number, isSelected: boolean, isTodayCell: boolean) => {
        let bg = 'bg-green-50 border-green-200 hover:bg-green-100';
        let dot = 'bg-green-500';
        let label = 'text-green-700';

        if (pct === 0) {
            bg = 'bg-green-50 border-green-200 hover:bg-green-100';
            dot = 'bg-green-500'; label = 'text-green-700';
        } else if (pct < 0.5) {
            bg = 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
            dot = 'bg-yellow-500'; label = 'text-yellow-700';
        } else if (pct < 1) {
            bg = 'bg-orange-50 border-orange-200 hover:bg-orange-100';
            dot = 'bg-orange-500'; label = 'text-orange-700';
        } else {
            bg = 'bg-red-50 border-red-200 hover:bg-red-100';
            dot = 'bg-red-500'; label = 'text-red-700';
        }

        if (isSelected) {
            bg = 'bg-primary/10 border-primary hover:bg-primary/15';
        }
        if (isTodayCell && !isSelected) {
            bg = bg + ' ring-2 ring-primary ring-offset-1';
        }

        return { bg, dot, label };
    };

    const roomTypeColors: Record<string, string> = {
        Single:       'bg-indigo-100 text-indigo-700',
        Double:       'bg-violet-100 text-violet-700',
        Suite:        'bg-pink-100 text-pink-700',
        Presidential: 'bg-amber-100 text-amber-700',
        Deluxe:       'bg-teal-100 text-teal-700',
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                    <Hotel className="h-7 w-7 text-primary" />
                    Availability Management
                </h1>
                <p className="text-gray-500">
                    Click any date on the calendar to see real-time room availability
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                            Total Rooms
                        </CardTitle>
                        <BedDouble className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-slate-800">{rooms.length}</div>
                        <p className="text-xs text-slate-500 mt-1">Across all categories</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                            Available Today
                        </CardTitle>
                        <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-green-600">{todayAvailable}</div>
                        <p className="text-xs text-slate-500 mt-1">Ready for check-in</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                            Occupied Today
                        </CardTitle>
                        <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-red-600">{todayOccupied}</div>
                        <p className="text-xs text-slate-500 mt-1">Currently checked in</p>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar Card */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Booking Calendar
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="min-w-[140px] text-center font-semibold text-slate-700 text-sm">
                                {format(currentMonth, 'MMMM yyyy')}
                            </span>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentMonth(new Date())}
                                className="px-3 h-8 text-xs font-semibold rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                            >
                                Today
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    {/* Day labels */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-2">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((cell, i) => {
                            if (!cell.isValid) {
                                return <div key={i} className="h-16" />;
                            }
                            const isSelected = !!(selectedDate && isSameDay(cell.date!, selectedDate));
                            const isTodayCell = isToday(cell.date!);
                            const { bg, dot, label } = getCellStyle(cell.occupancyPct!, isSelected, isTodayCell);
                            const freeCount = rooms.length - cell.occupiedCount!;

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleDayClick(cell.date!)}
                                    className={`
                                        h-16 rounded-lg border flex flex-col items-center justify-center gap-1
                                        cursor-pointer transition-all duration-150 select-none
                                        ${bg}
                                        ${isSelected ? 'shadow-md scale-105' : 'hover:scale-105'}
                                    `}
                                >
                                    <span className={`text-sm font-bold ${isTodayCell ? 'text-primary' : 'text-slate-700'}`}>
                                        {cell.dayNumber}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                                        <span className={`text-[10px] font-semibold leading-none ${label}`}>
                                            {freeCount === 0 ? 'Full' : `${freeCount} free`}
                                        </span>
                                    </div>
                                    {isTodayCell && (
                                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider leading-none">
                                            Today
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-slate-100">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legend:</span>
                        {[
                            { dot: 'bg-green-500',  text: 'text-green-700', label: 'All free' },
                            { dot: 'bg-yellow-500', text: 'text-yellow-700', label: 'Partially booked' },
                            { dot: 'bg-orange-500', text: 'text-orange-700', label: 'Mostly booked' },
                            { dot: 'bg-red-500',    text: 'text-red-700',    label: 'Fully booked' },
                        ].map(({ dot, text, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                                <span className={`text-xs font-medium ${text}`}>{label}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── POPUP MODAL ── */}
            {showPopup && selectedDate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)' }}
                    onClick={() => setShowPopup(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
                        style={{ animation: 'slideUp 0.2s ease' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Calendar className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                    </h2>
                                    <p className="text-xs text-slate-500">Real-time room availability</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPopup(false)}
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                {availableCount} Available
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-semibold">
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                {occupiedCount} Occupied
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-sm font-semibold">
                                🏨 {rooms.length} Total
                            </span>
                        </div>

                        {/* Room List */}
                        <div className="divide-y divide-slate-100">
                            {roomAvailabilityForDate.map(({ room, booking, isOccupied }) => (
                                <div
                                    key={room.id}
                                    className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                                >
                                    {/* Left: room info */}
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <BedDouble className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    Room #{room.number}
                                                </span>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roomTypeColors[room.type] || 'bg-slate-100 text-slate-600'}`}>
                                                    {room.type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {room.capacity} guest{room.capacity > 1 ? 's' : ''}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    PKR {room.price.toLocaleString()}/night
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {room.amenities.slice(0, 3).map((a: string, idx: number) => (
                                                    <span key={idx} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                                        {a}
                                                    </span>
                                                ))}
                                                {room.amenities.length > 3 && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                                        +{room.amenities.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: status + booking */}
                                    <div className="flex-shrink-0 text-right">
                                        <Badge variant={isOccupied ? 'destructive' : 'success'}>
                                            {isOccupied ? 'Occupied' : 'Available'}
                                        </Badge>
                                        {booking && (
                                            <div className="mt-2 space-y-0.5">
                                                <p className="text-xs font-semibold text-slate-700">{booking.guestName}</p>
                                                <p className="text-xs text-slate-400">
                                                    {format(new Date(booking.checkIn), 'MMM d')} → {format(new Date(booking.checkOut), 'MMM d')}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {roomAvailabilityForDate.length === 0 && (
                                <div className="py-12 text-center text-slate-400">
                                    <Hotel className="h-10 w-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No rooms found</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl text-center">
                            <p className="text-xs text-slate-400">Data is updated in real-time from the live database</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
            `}</style>
        </div>
    );
}
