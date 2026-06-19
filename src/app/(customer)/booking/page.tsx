'use client';

import React, { useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/context/DataContext';
import type { Booking } from '@/types';
import { eachDayOfInterval, addDays } from 'date-fns';

// Parse YYYY-MM-DD as a LOCAL date (not UTC) to avoid timezone off-by-one bugs
function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function BookingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addBooking, rooms, bookings } = useData();
    const preselectedRoomId = searchParams.get('roomId');
    const availableRooms = rooms.filter(room => room.available);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        roomId: preselectedRoomId || '',
        checkIn: '',
        checkOut: '',
        guests: 1,
        specialRequests: '',
        paymentMethod: '' as 'online' | 'cash' | '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const disabledDates = React.useMemo(() => {
        if (!formData.roomId) return [];
        const roomBookings = bookings.filter(b => b.roomId === formData.roomId && (b.status === 'Confirmed' || b.status === 'Completed' || b.status === 'Pending'));
        let disabled: Date[] = [];
        roomBookings.forEach(booking => {
            if (!booking.checkIn || !booking.checkOut) return;
            const start = parseLocalDate(booking.checkIn);
            const end = parseLocalDate(booking.checkOut);
            const dates = eachDayOfInterval({ start, end: addDays(end, -1) });
            disabled = [...disabled, ...dates];
        });
        return disabled;
    }, [formData.roomId, bookings]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.guestName.trim()) newErrors.guestName = 'Name is required';
        if (!formData.guestEmail.trim()) newErrors.guestEmail = 'Email is required';
        if (!formData.guestPhone.trim()) newErrors.guestPhone = 'Phone is required';
        if (!formData.roomId) newErrors.roomId = 'Please select a room';
        if (!formData.checkIn) newErrors.checkIn = 'Check-in date is required';
        if (!formData.checkOut) newErrors.checkOut = 'Check-out date is required';
        if (!formData.paymentMethod) newErrors.paymentMethod = 'Please select a payment method';

        if (formData.checkIn && formData.checkOut) {
            const checkInDate = parseLocalDate(formData.checkIn);
            const checkOutDate = parseLocalDate(formData.checkOut);
            if (checkOutDate <= checkInDate) {
                newErrors.checkOut = 'Check-out must be after check-in';
            } else {
                const selectedDates = eachDayOfInterval({ start: checkInDate, end: addDays(checkOutDate, -1) });
                const hasOverlap = selectedDates.some(selected =>
                    disabledDates.some(disabled => disabled.getTime() === selected.getTime())
                );
                if (hasOverlap) {
                    newErrors.checkIn = 'Selected dates overlap with an existing booking. Please choose different dates.';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const room = rooms.find(r => r.id === formData.roomId);
        if (!room) return;

        const checkInDate = parseLocalDate(formData.checkIn);
        const checkOutDate = parseLocalDate(formData.checkOut);
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        const totalPrice = room.price * nights;

        const newBooking: Booking = {
            id: `BK-${Date.now()}`,
            guestName: formData.guestName,
            guestEmail: formData.guestEmail,
            guestPhone: formData.guestPhone,
            roomId: formData.roomId,
            roomNumber: room.number,
            roomType: room.type,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guests: formData.guests,
            totalPrice,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            specialRequests: formData.specialRequests || '',
        };

        setIsLoading(true);

        try {
            const savedBooking = await addBooking(newBooking);
            const finalBookingId = savedBooking?.id || newBooking.id;

            if (formData.paymentMethod === 'online') {
                // ✅ Online Payment — redirect to Stripe
                const res = await fetch('/api/stripe/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: finalBookingId,
                        guestName: formData.guestName,
                        guestEmail: formData.guestEmail,
                        guestPhone: formData.guestPhone,
                        roomNumber: room.number,
                        roomType: room.type,
                        checkIn: formData.checkIn,
                        checkOut: formData.checkOut,
                        guests: formData.guests,
                        totalPrice,
                        specialRequests: formData.specialRequests || 'None',
                    }),
                });

                const data = await res.json();
                if (data.success && data.url) {
                    window.location.href = data.url; // ✅ Redirect to Stripe checkout
                } else {
                    console.error('Stripe error:', data.error);
                    setIsLoading(false);
                }

            } else {
                // ✅ Cash Payment — send to Orchestrator as Pending
                fetch(process.env.NEXT_PUBLIC_N8N_ORCHESTRATOR_WEBHOOK!, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source: 'booking',
                        data: {
                            bookingId: finalBookingId,
                            guestName: formData.guestName,
                            guestEmail: formData.guestEmail,
                            guestPhone: formData.guestPhone,
                            roomNumber: room.number,
                            roomType: room.type,
                            checkIn: formData.checkIn,
                            checkOut: formData.checkOut,
                            guests: formData.guests,
                            totalPrice,
                            status: 'Pending',
                            paymentMethod: 'Cash',
                            specialRequests: formData.specialRequests || 'None',
                            createdAt: new Date().toISOString(),
                        },
                    }),
                }).catch((err) => console.error('n8n orchestrator error:', err));

                router.push(`/booking-confirmation/${finalBookingId}`);
            }
        } catch (err) {
            console.error('Failed to book:', err);
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">Book Your Room</CardTitle>
                    <p className="text-gray-600">Fill in the details below to complete your booking</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                            <Input
                                value={formData.guestName}
                                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                                placeholder="John Doe"
                            />
                            {errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Email *</label>
                            <Input
                                type="email"
                                value={formData.guestEmail}
                                onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                                placeholder="john@example.com"
                            />
                            {errors.guestEmail && <p className="text-red-500 text-xs mt-1">{errors.guestEmail}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Phone Number *</label>
                            <Input
                                type="tel"
                                value={formData.guestPhone}
                                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                                placeholder="+1234567890"
                            />
                            {errors.guestPhone && <p className="text-red-500 text-xs mt-1">{errors.guestPhone}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Room Type *</label>
                            <Select
                                value={formData.roomId}
                                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                            >
                                <option value="">Select a room</option>
                                {availableRooms.map(room => (
                                    <option key={room.id} value={room.id}>
                                        {room.type} Room {room.number} - PKR {room.price.toLocaleString()}/night
                                    </option>
                                ))}
                            </Select>
                            {errors.roomId && <p className="text-red-500 text-xs mt-1">{errors.roomId}</p>}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Check-in Date *</label>
                                <Input
                                    type="date"
                                    value={formData.checkIn}
                                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                {errors.checkIn && <p className="text-red-500 text-xs mt-1">{errors.checkIn}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Check-out Date *</label>
                                <Input
                                    type="date"
                                    value={formData.checkOut}
                                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                                    min={formData.checkIn || new Date().toISOString().split('T')[0]}
                                />
                                {errors.checkOut && <p className="text-red-500 text-xs mt-1">{errors.checkOut}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Number of Guests *</label>
                            <Select
                                value={formData.guests.toString()}
                                onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                            >
                                <option value="1">1 Guest</option>
                                <option value="2">2 Guests</option>
                                <option value="3">3 Guests</option>
                                <option value="4">4 Guests</option>
                                <option value="5">5 Guests</option>
                                <option value="6">6 Guests</option>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Special Requests (Optional)</label>
                            <Textarea
                                value={formData.specialRequests}
                                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                                placeholder="Any special requests or requirements..."
                                rows={3}
                            />
                        </div>

                        {/* ✅ Payment Method Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Payment Method *</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    onClick={() => setFormData({ ...formData, paymentMethod: 'online' })}
                                    className={`cursor-pointer border-2 rounded-lg p-4 text-center transition-all ${
                                        formData.paymentMethod === 'online'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-2xl mb-1">💳</div>
                                    <p className="font-semibold text-sm">Pay Online</p>
                                    <p className="text-xs text-gray-500 mt-1">Credit / Debit Card</p>
                                    <p className="text-xs text-green-600 font-medium mt-1">Instant Confirmation</p>
                                </div>
                                <div
                                    onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                                    className={`cursor-pointer border-2 rounded-lg p-4 text-center transition-all ${
                                        formData.paymentMethod === 'cash'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-2xl mb-1">💵</div>
                                    <p className="font-semibold text-sm">Pay at Hotel</p>
                                    <p className="text-xs text-gray-500 mt-1">Cash on Arrival</p>
                                    <p className="text-xs text-yellow-600 font-medium mt-1">Pending Until Payment</p>
                                </div>
                            </div>
                            {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>}
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <Button type="submit" className="flex-1" disabled={isLoading}>
                                {isLoading
                                    ? 'Processing...'
                                    : formData.paymentMethod === 'online'
                                        ? 'Proceed to Payment 💳'
                                        : 'Confirm Booking'
                                }
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push('/availability')}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function BookingPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[40vh] items-center justify-center font-sans">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        }>
            <BookingContent />
        </Suspense>
    );
}