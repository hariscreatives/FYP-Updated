import { complaintsAPI, emergenciesAPI } from '@/lib/api';

export const maxDuration = 60;

function normalizeToYMD(dateStr: string): string | null {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return dateStr.trim();
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch {}
    return null;
}

async function fetchFirestoreRooms() {
    const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!PROJECT_ID || !API_KEY) throw new Error('Firebase credentials missing');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/rooms?key=${API_KEY}&pageSize=200`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch rooms from Firestore');
    const data = await res.json();
    return (data.documents || []).map((doc: any) => {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(doc.fields as Record<string, any>)) {
            const val = v as any;
        if (val.integerValue !== undefined) out[k] = Number(val.integerValue);
        else if (val.doubleValue !== undefined) out[k] = Number(val.doubleValue);
        else if (val.stringValue !== undefined) out[k] = val.stringValue;
        else if (val.booleanValue !== undefined) out[k] = val.booleanValue;
        else out[k] = null;
        }
        return out;
    });
}

const openAITools = [
    {
        type: 'function',
        function: {
            name: 'listAvailableRooms',
            description: 'Retrieve all hotel rooms. Useful to find available rooms, prices, capacities, and amenities.',
            parameters: {
                type: 'object',
                properties: {
                    roomType: { type: 'string', description: 'Optional filter for room type (e.g. Single, Double, Suite, Deluxe, Presidential).' },
                    maxPrice: { type: 'number', description: 'Optional filter for maximum room price.' },
                    checkIn: { type: 'string', description: 'Optional check-in date in YYYY-MM-DD format to filter out booked rooms.' },
                    checkOut: { type: 'string', description: 'Optional check-out date in YYYY-MM-DD format to filter out booked rooms.' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'createRoomBooking',
            description: 'Create a new room booking reservation for a guest. Always ask for payment method (online or cash) before calling this tool. IMPORTANT: Do NOT calculate totalPrice yourself — it will be calculated automatically server-side based on room price × number of nights.',
            parameters: {
                type: 'object',
                properties: {
                    guestName: { type: 'string', description: 'Full name of the guest.' },
                    guestEmail: { type: 'string', description: 'Email address of the guest.' },
                    guestPhone: { type: 'string', description: 'Phone number of the guest.' },
                    roomId: { type: 'string', description: 'The ID of the room (e.g. room-1, room-2).' },
                    roomNumber: { type: 'string', description: 'The room number (e.g. 101, 102).' },
                    roomType: { type: 'string', description: 'The type of the room.' },
                    checkIn: { type: 'string', description: 'Check-in date in YYYY-MM-DD format.' },
                    checkOut: { type: 'string', description: 'Check-out date in YYYY-MM-DD format.' },
                    guests: { type: 'number', description: 'Number of guests.' },
                    totalPrice: { type: 'number', description: 'Pass 0 here — total price is calculated automatically server-side.' },
                    paymentMethod: { type: 'string', description: 'Payment method: "online" for card payment via Stripe, or "cash" for cash at hotel reception.' },
                    specialRequests: { type: 'string', description: 'Any special requests. Use empty string if none.' }
                },
                required: ['guestName', 'guestEmail', 'guestPhone', 'roomId', 'roomNumber', 'roomType', 'checkIn', 'checkOut', 'guests', 'totalPrice', 'paymentMethod']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'checkRoomAvailability',
            description: 'Check if a specific room is available for the given check-in and check-out dates.',
            parameters: {
                type: 'object',
                properties: {
                    roomId: { type: 'string', description: 'The ID of the room.' },
                    roomNumber: { type: 'string', description: 'The room number.' },
                    checkIn: { type: 'string', description: 'Check-in date in YYYY-MM-DD format.' },
                    checkOut: { type: 'string', description: 'Check-out date in YYYY-MM-DD format.' }
                },
                required: ['checkIn', 'checkOut']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'submitComplaint',
            description: 'Submit a new complaint for a guest.',
            parameters: {
                type: 'object',
                properties: {
                    guestName: { type: 'string' },
                    guestEmail: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string' }
                },
                required: ['guestName', 'guestEmail', 'category', 'description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'fileEmergencyAlert',
            description: 'Report an emergency.',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    description: { type: 'string' },
                    contactNumber: { type: 'string' },
                    location: { type: 'string' }
                },
                required: ['type', 'description', 'contactNumber', 'location']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getGuestBookings',
            description: 'Retrieve bookings for a guest.',
            parameters: {
                type: 'object',
                properties: {
                    guestEmail: { type: 'string' },
                    bookingId: { type: 'string' }
                }
            }
        }
    }
];

async function executeTool(name: string, args: any, baseUrl: string, userContext?: any) {
    console.log(`Executing tool: ${name} with args:`, args);
    try {
        if (name === 'listAvailableRooms') {
            let rooms = await fetchFirestoreRooms();
            if (args.roomType) rooms = rooms.filter((r: any) => r.type.toLowerCase() === args.roomType.toLowerCase());
            if (args.maxPrice) rooms = rooms.filter((r: any) => r.price <= args.maxPrice);
            if (args.checkIn && args.checkOut) {
                const normalizedIn = normalizeToYMD(args.checkIn);
                const normalizedOut = normalizeToYMD(args.checkOut);
                if (normalizedIn && normalizedOut) {
                    const reqIn = new Date(normalizedIn).getTime();
                    const reqOut = new Date(normalizedOut).getTime();
                    const res = await fetch(`${baseUrl}/api/bookings`);
                    const data = await res.json();
                    const bookings = data.bookings || [];
                    rooms = rooms.filter((r: any) => {
                        const overlaps = bookings.some((b: any) => {
                            if (b.status === 'Cancelled' || b.roomId !== r.id) return false;
                            const bIn = new Date(b.checkIn).getTime();
                            const bOut = new Date(b.checkOut).getTime();
                            return reqIn < bOut && reqOut > bIn;
                        });
                        return !overlaps;
                    });
                }
            }
            return rooms;
        }

        if (name === 'checkRoomAvailability') {
            let { roomId, roomNumber, checkIn, checkOut } = args;
            if (!roomId && roomNumber) {
                const rooms = await fetchFirestoreRooms();
                const room = rooms.find((r: any) => String(r.number) === String(roomNumber));
                if (room) roomId = room.id;
            }
            if (!roomId) return { success: false, error: 'Could not find the specified room.' };
            const normalizedIn = normalizeToYMD(checkIn);
            const normalizedOut = normalizeToYMD(checkOut);
            if (!normalizedIn || !normalizedOut) return { success: false, error: 'Invalid dates provided.' };
            const reqIn = new Date(normalizedIn).getTime();
            const reqOut = new Date(normalizedOut).getTime();
            const res = await fetch(`${baseUrl}/api/bookings`);
            const data = await res.json();
            if (!data.success) return { success: false, error: 'Failed to fetch bookings.' };
            const bookings = data.bookings || [];
            const overlaps = bookings.filter((b: any) => {
                if (b.status === 'Cancelled' || b.roomId !== roomId) return false;
                const bIn = new Date(b.checkIn).getTime();
                const bOut = new Date(b.checkOut).getTime();
                return reqIn < bOut && reqOut > bIn;
            });
            if (overlaps.length > 0) return { available: false, message: `Room is NOT available. Conflicts with ${overlaps.length} existing booking(s).` };
            return { available: true, message: 'Room is available for these dates.' };
        }

        if (name === 'createRoomBooking') {
            if (!args.guestName && userContext?.name) args.guestName = userContext.name;
            if (!args.guestEmail && userContext?.email) args.guestEmail = userContext.email;
            if (!args.guestPhone && userContext?.phone) args.guestPhone = userContext.phone;

            // ✅ Resolve roomId from roomNumber if missing
            if (!args.roomId && args.roomNumber) {
                const allRooms = await fetchFirestoreRooms();
                const matchedRoom = allRooms.find((r: any) => String(r.number) === String(args.roomNumber));
                if (matchedRoom) {
                    args.roomId = matchedRoom.id;
                    console.log(`[Booking] Resolved roomId: ${args.roomId} from roomNumber: ${args.roomNumber}, price: ${matchedRoom.price}`);
                } else {
                    console.log(`[Booking] Could not find room with number: ${args.roomNumber}`);
                }
            }

            if (args.checkIn) {
                const normalized = normalizeToYMD(args.checkIn);
                if (!normalized) return { success: false, error: `Invalid check-in date.` };
                args.checkIn = normalized;
            }
            if (args.checkOut) {
                const normalized = normalizeToYMD(args.checkOut);
                if (!normalized) return { success: false, error: `Invalid check-out date.` };
                args.checkOut = normalized;
            }

            // ✅ Always calculate totalPrice server-side
            if (args.checkIn && args.checkOut) {
                const inDate = new Date(args.checkIn);
                const outDate = new Date(args.checkOut);
                if (outDate <= inDate) return { success: false, error: 'Check-out must be after check-in.' };

                const msPerDay = 1000 * 60 * 60 * 24;
                const nights = Math.round((outDate.getTime() - inDate.getTime()) / msPerDay);
                const validNights = Math.max(1, nights);

                // ✅ Fetch ALL rooms and find by roomId OR roomNumber
                try {
                    const allRooms = await fetchFirestoreRooms();
                    console.log(`[Booking Debug] Looking for roomId: ${args.roomId}, roomNumber: ${args.roomNumber}`);
                    console.log(`[Booking Debug] Available rooms:`, allRooms.map((r: any) => `${r.id}:${r.number}:${r.price}`).join(', '));

                    let foundRoom = allRooms.find((r: any) => r.id === args.roomId);
                    if (!foundRoom && args.roomNumber) {
                        foundRoom = allRooms.find((r: any) => String(r.number) === String(args.roomNumber));
                    }

                    if (foundRoom) {
                        const roomPrice = Number(foundRoom.price) || 0;
                        args.totalPrice = roomPrice * validNights;
                        if (!args.roomId) args.roomId = foundRoom.id;
                        if (!args.roomNumber) args.roomNumber = foundRoom.number;
                        if (!args.roomType) args.roomType = foundRoom.type;
                        console.log(`[Booking] Found room: ${foundRoom.id}, Price: ${roomPrice}, Nights: ${validNights}, Total: ${args.totalPrice}`);
                    } else {
                        console.log(`[Booking] Room NOT found! roomId: ${args.roomId}, roomNumber: ${args.roomNumber}`);
                    }
                } catch (priceErr) {
                    console.error('[Booking] Price fetch error:', priceErr);
                }
            }

            if (!args.guestName || !args.guestEmail || !args.guestPhone || !args.roomId || !args.checkIn || !args.checkOut) {
                const missing = ['guestName', 'guestEmail', 'guestPhone', 'roomId', 'checkIn', 'checkOut'].filter(f => !args[f]);
                return { success: false, error: `Missing fields: ${missing.join(', ')}.` };
            }

            const paymentMethod = (args.paymentMethod || 'cash').toLowerCase();

            const bookingRes = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...args, specialRequests: args.specialRequests || '' }),
            });
            const bookingData = await bookingRes.json();
            if (!bookingData.success) return { success: false, error: bookingData.error || 'Failed to save booking.' };

            const savedBooking = bookingData.booking;

            if (paymentMethod === 'online') {
                console.log('[Chat→Stripe] Calling Stripe checkout at:', `${baseUrl}/api/stripe/create-checkout`);
                console.log('[Chat→Stripe] Payload:', {
                    bookingId: savedBooking.id,
                    guestEmail: args.guestEmail,
                    totalPrice: args.totalPrice,
                    roomNumber: args.roomNumber,
                });
                const stripeRes = await fetch(`${baseUrl}/api/stripe/create-checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: savedBooking.id,
                        guestName: args.guestName,
                        guestEmail: args.guestEmail,
                        guestPhone: args.guestPhone,
                        roomNumber: args.roomNumber,
                        roomType: args.roomType,
                        checkIn: args.checkIn,
                        checkOut: args.checkOut,
                        guests: args.guests,
                        totalPrice: args.totalPrice,
                        specialRequests: args.specialRequests || 'None',
                    }),
                });
                const stripeData = await stripeRes.json();
                console.log('[Chat→Stripe] Response:', stripeData);
                if (stripeData.success && stripeData.url) {
                    return {
                        success: true,
                        booking: savedBooking,
                        paymentMethod: 'online',
                        paymentUrl: stripeData.url,
                        message: `✅ Booking created!\n• Booking ID: ${savedBooking.id}\n• Room: ${args.roomType} — Room ${args.roomNumber}\n• Check-in: ${args.checkIn}\n• Check-out: ${args.checkOut}\n• Total: PKR ${args.totalPrice}\n\n${stripeData.url}`,
                    };
                } else {
                    console.error('[Chat→Stripe] Stripe checkout failed:', stripeData.error);
                    return { success: false, error: `Failed to create payment link: ${stripeData.error || 'Unknown error'}. Please try cash payment or use the manual booking page.` };
                }
            } else {
                fetch(process.env.NEXT_PUBLIC_N8N_ORCHESTRATOR_WEBHOOK!, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source: 'booking',
                        data: {
                            bookingId: savedBooking.id,
                            guestName: args.guestName,
                            guestEmail: args.guestEmail,
                            guestPhone: args.guestPhone,
                            roomNumber: args.roomNumber,
                            roomType: args.roomType,
                            checkIn: args.checkIn,
                            checkOut: args.checkOut,
                            guests: args.guests,
                            totalPrice: args.totalPrice,
                            status: 'Pending',
                            paymentMethod: 'Cash',
                            specialRequests: args.specialRequests || 'None',
                            createdAt: savedBooking.createdAt || new Date().toISOString(),
                        },
                    }),
                }).catch((err) => console.error('n8n orchestrator error:', err));

                return {
                    success: true,
                    booking: savedBooking,
                    paymentMethod: 'cash',
                    message: `✅ Booking submitted!\n• Booking ID: ${savedBooking.id}\n• Room: ${args.roomType} — Room ${args.roomNumber}\n• Check-in: ${args.checkIn}\n• Check-out: ${args.checkOut}\n• Total Due at Hotel: PKR ${args.totalPrice}\n⏳ Status: Pending\n\nPlease pay at hotel reception. Your room is held for 24 hours. You will receive a booking email and WhatsApp shortly.`,
                };
            }
        }

        if (name === 'submitComplaint') {
            const newComplaint = await complaintsAPI.create(args);
            return { success: true, complaint: newComplaint };
        }

        if (name === 'fileEmergencyAlert') {
            const newEmergency = await emergenciesAPI.create(args);
            return { success: true, emergency: newEmergency };
        }

        if (name === 'getGuestBookings') {
            const res = await fetch(`${baseUrl}/api/bookings`);
            const data = await res.json();
            const bookings = data.success ? data.bookings : [];
            const matched = bookings.filter((b: any) => {
                if (args.bookingId && String(b.id).toLowerCase() === String(args.bookingId).toLowerCase()) return true;
                if (args.guestEmail && String(b.guestEmail).toLowerCase() === String(args.guestEmail).toLowerCase()) return true;
                return false;
            });
            return { success: true, bookings: matched };
        }
    } catch (e: any) {
        console.error(`Tool execution failed for ${name}:`, e);
        return { success: false, error: e.message || 'Operation failed' };
    }
    return { error: `Tool ${name} not found` };
}

export async function POST(req: Request) {
    const apiKey = process.env.OPENAI_API_KEY;
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const headerOrigin = `${proto}://${host}`;
    // Prefer NEXT_PUBLIC_APP_URL for reliable internal API calls (avoids header issues in local dev)
    const origin = (process.env.NEXT_PUBLIC_APP_URL || headerOrigin).replace(/\/$/, '');

    if (!apiKey) {
        return Response.json({ message: "Chatbot is offline. OPENAI_API_KEY not configured." });
    }

    try {
        const { messages, userContext } = await req.json();
        if (!messages || messages.length === 0) return Response.json({ error: 'No messages provided' }, { status: 400 });

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let systemInstruction = 'You are Grand Hotel Assistant, a friendly and professional virtual concierge. ' +
            `Today's date is ${todayStr}. ` +
            'CRITICAL: Ask exactly ONE question at a time. Never ask multiple questions at once. ' +
            'Keep responses short and direct (1-2 sentences max). ' +
            'When a guest wants to book a room, follow this EXACT order — do NOT skip any step: ' +
            '1. Ask for Full Name. ' +
            '2. Ask for Phone Number. ' +
            '3. Ask for Email address. ALWAYS ask this — never skip it, even if guest is logged in. ' +
            '4. List 4 room types: Single, Double, Suite, Presidential. Ask which they want. ' +
            '5. Ask for Check-in date. ' +
            '6. Ask for Check-out date. ' +
            '7. Call listAvailableRooms with category + dates. Then display results in this EXACT format:\n' +
            '   [Room Type] Rooms: [one-line description of that room type].\n' +
            '   We have the following [Room Type] rooms available:\n' +
            '   1. Room [number]\n' +
            '   2. Room [number]\n' +
            '   (and so on — list room numbers only, do NOT repeat the description for each room)\n' +
            '   Then ask: "Which room number would you like?" ' +
            '8. Call checkRoomAvailability to verify. ' +
            '9. Ask number of guests. ' +
            '10. Ask payment method: "online" (card via Stripe) or "cash" (pay at hotel). ' +
            '11. Call createRoomBooking with all info. Pass totalPrice as 0 — server calculates it automatically. ' +
            'IMPORTANT: NEVER calculate totalPrice yourself. Always pass 0 and let the server calculate it. ' +
            'IMPORTANT: NEVER skip step 3 (email). Always explicitly ask the guest for their email address. ' +
            'After booking: ' +
            '- Online: Show booking summary with exact total. Tell guest to click the payment button. ' +
            '- Cash: Confirm booking is pending and they will pay at reception. ' +
            'Date rules: Convert all dates to YYYY-MM-DD. Assume current year if no year given. ' +
            'Maintain a polite concierge tone.';

        if (userContext && userContext.name) {
            systemInstruction += ` Guest is logged in as ${userContext.name} with registered email "${userContext.email}".` +
                ` EMAIL STEP RULES (step 3): Ask EXACTLY this: "Is your email ${userContext.email}, or would you like to use a different one?"` +
                ` Then handle the response as follows:` +
                ` — If the guest confirms (says yes / okay / correct / that's fine or similar): use "${userContext.email}" as guestEmail in createRoomBooking.` +
                ` — If the guest types a DIFFERENT email address: use THAT new email as guestEmail in createRoomBooking. Do NOT fall back to "${userContext.email}".` +
                ` You MUST wait for the guest's reply to step 3 before moving to step 4. Never assume or auto-fill the email.`;
        }

        const history = messages.slice(0, -1).map((msg: any) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.message
        }));

        const lastMessage = messages[messages.length - 1].message;
        const apiMessages: any[] = [
            { role: 'system', content: systemInstruction },
            ...history,
            { role: 'user', content: lastMessage }
        ];

        let keepLooping = true;
        let responseText = '';
        let paymentUrl: string | null = null;
        let iterations = 0;
        const maxIterations = 5;

        while (keepLooping && iterations < maxIterations) {
            iterations++;
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: 'gpt-4o-mini', messages: apiMessages, tools: openAITools, tool_choice: 'auto' })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenAI API error: ${response.statusText} - ${errText}`);
            }

            const data = await response.json();
            const choice = data.choices?.[0];
            if (!choice) throw new Error('No choices returned from OpenAI');

            const assistantMessage = choice.message;
            apiMessages.push(assistantMessage);

            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                for (const toolCall of assistantMessage.tool_calls) {
                    const { name, arguments: argsString } = toolCall.function;
                    let args = {};
                    try { args = JSON.parse(argsString); } catch (err) { }
                    const toolResult = await executeTool(name, args, origin, userContext);

                    // ✅ Capture paymentUrl directly from tool result BEFORE sending to OpenAI.
                    // This prevents the AI from echoing (and potentially mangling) the long Stripe URL.
                    if (toolResult && (toolResult as any).paymentUrl) {
                        paymentUrl = (toolResult as any).paymentUrl;
                        console.log('[Chat] Captured paymentUrl directly from tool result:', paymentUrl?.substring(0, 80) + '...');
                    }

                    // Strip the raw URL from what OpenAI sees — tell it a payment link was generated
                    // so it gives the user a clean confirmation message without trying to repeat the URL.
                    const resultForAI = { ...(toolResult as any) };
                    if (resultForAI.paymentUrl) {
                        delete resultForAI.paymentUrl;
                        resultForAI.message = resultForAI.message
                            ? resultForAI.message.replace(/https:\/\/checkout\.stripe\.com\S*/g, '[payment link generated]')
                            : resultForAI.message;
                    }

                    apiMessages.push({ role: 'tool', tool_call_id: toolCall.id, name, content: JSON.stringify(resultForAI) });
                }
            } else {
                responseText = assistantMessage.content || '';
                keepLooping = false;
            }
        }

        return Response.json({ message: responseText, ...(paymentUrl ? { paymentUrl } : {}) });
    } catch (e: any) {
        console.error('Chat endpoint error:', e);
        return Response.json({ error: e.message || 'An error occurred' }, { status: 500 });
    }
}