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
            console.error('[Stripe] Invalid price — totalPrice must be > 0, received:', totalPrice);
            return Response.json({ success: false, error: `Invalid price (received: ${totalPrice}). Room price could not be calculated.` }, { status: 400 });
        }

        // Convert PKR to USD (1 USD = 280 PKR approx)
        const usdAmount = Math.round((numericPrice / 280) * 100);

        // Determine the correct app URL for Stripe redirect URLs.
        // Prefer the request's own origin so it works in all environments (local, prod, staging).
        const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        const rawReferer = req.headers.get('referer') || '';
        // Extract only origin from referer (e.g. "http://localhost:3000/chat" → "http://localhost:3000")
        const refererOrigin = rawReferer ? (() => { try { return new URL(rawReferer).origin; } catch { return ''; } })() : '';
        const requestOrigin = req.headers.get('origin') || refererOrigin || '';
        const host = req.headers.get('host') || 'localhost:3000';
        const proto = req.headers.get('x-forwarded-proto') || 'http';
        const headerOrigin = `${proto}://${host}`;
        // Use NEXT_PUBLIC_APP_URL if it's not localhost, otherwise fall back to request origin
        const appUrl = (configuredAppUrl && !configuredAppUrl.includes('localhost'))
            ? configuredAppUrl
            : (requestOrigin || configuredAppUrl || headerOrigin);

        console.log('[Stripe] Using appUrl for redirect:', appUrl);

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
            success_url: `${appUrl}/payment-success?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}&totalPrice=${numericPrice}&guestName=${encodeURIComponent(guestName)}&guestEmail=${encodeURIComponent(guestEmail)}&guestPhone=${encodeURIComponent(guestPhone)}&roomNumber=${encodeURIComponent(roomNumber)}&roomType=${encodeURIComponent(roomType)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&specialRequests=${encodeURIComponent(specialRequests || 'None')}`,
            cancel_url: `${appUrl}/booking?cancelled=true`,
        });

        console.log('[Stripe] Session created:', session.id);
        return Response.json({ success: true, url: session.url });
    } catch (error: any) {
        console.error('Stripe checkout error:', error.message);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}