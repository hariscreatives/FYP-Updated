import { NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            bookingId,
            guestName,
            guestEmail,
            guestPhone,
            roomNumber,
            roomType,
            checkIn,
            checkOut,
            guests,
            totalPrice,
            specialRequests,
        } = body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: guestEmail,
            line_items: [
                {
                    price_data: {
                        currency: 'pkr',
                        product_data: {
                            name: `Grand Hotel — ${roomType} Room ${roomNumber}`,
                            description: `Check-in: ${checkIn} | Check-out: ${checkOut} | Guests: ${guests}`,
                        },
                        unit_amount: totalPrice * 100, // Stripe needs amount in smallest unit
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                bookingId,
                guestName,
                guestEmail,
                guestPhone,
                roomNumber,
                roomType,
                checkIn,
                checkOut,
                guests: String(guests),
                totalPrice: String(totalPrice),
                specialRequests: specialRequests || 'None',
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}&totalPrice=${totalPrice}&guestName=${encodeURIComponent(guestName)}&guestEmail=${encodeURIComponent(guestEmail)}&guestPhone=${encodeURIComponent(guestPhone)}&roomNumber=${encodeURIComponent(roomNumber)}&roomType=${encodeURIComponent(roomType)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&specialRequests=${encodeURIComponent(specialRequests || 'None')}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking?cancelled=true`,
        });

        return Response.json({ success: true, url: session.url });
    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}