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

        const numericPrice = Number(totalPrice) || 0;
        console.log('[Stripe] totalPrice received:', numericPrice);

        if (numericPrice <= 0) {
            return Response.json({ success: false, error: 'Invalid price' }, { status: 400 });
        }

        // Convert PKR to USD (1 USD = 280 PKR approx)
        const usdAmount = Math.round((numericPrice / 280) * 100);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: guestEmail,
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Grand Hotel — ${roomType} Room ${roomNumber}`,
                            description: `PKR ${numericPrice} | Check-in: ${checkIn} | Check-out: ${checkOut} | Guests: ${guests}`,
                        },
                        unit_amount: usdAmount,
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
                totalPrice: String(numericPrice),
                specialRequests: specialRequests || 'None',
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}&totalPrice=${numericPrice}&guestName=${encodeURIComponent(guestName)}&guestEmail=${encodeURIComponent(guestEmail)}&guestPhone=${encodeURIComponent(guestPhone)}&roomNumber=${encodeURIComponent(roomNumber)}&roomType=${encodeURIComponent(roomType)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&specialRequests=${encodeURIComponent(specialRequests || 'None')}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking?cancelled=true`,
        });

        console.log('[Stripe] Session created:', session.id);
        return Response.json({ success: true, url: session.url });
    } catch (error: any) {
        console.error('Stripe checkout error:', error.message);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}