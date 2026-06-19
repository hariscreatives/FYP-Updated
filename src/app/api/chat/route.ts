import { complaintsAPI, emergenciesAPI } from '@/lib/api';

export const maxDuration = 60; // Set max timeout to 60 seconds for Vercel

// Helper: Normalize a date string (any format) to YYYY-MM-DD
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

// Helper: Fetch rooms from Firestore REST API
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
            out[k] = v.stringValue ?? v.doubleValue ?? v.booleanValue ?? v.nullValue ?? null;
        }
        return out;
    });
}

// OpenAI Tools Definition
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
            description: 'Create a new room booking reservation for a guest. Always ask for payment method (online or cash) before calling this tool.',
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
                    totalPrice: { type: 'number', description: 'Total price of the booking.' },
                    paymentMethod: { type: 'string', description: 'Payment method chosen by guest: "online" for card/online payment via Stripe, or "cash" for cash payment at hotel reception.' },
                    specialRequests: { type: 'string', description: 'Any special requests from the guest. Use empty string if none.' }
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
                    roomId: { type: 'string', description: 'The ID of the room (e.g. room-1).' },
                    roomNumber: { type: 'string', description: 'The room number (e.g. 101, 203).' },
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
            description: 'Submit a new complaint, maintenance request, or service issue for a guest.',
            parameters: {
                type: 'object',
                properties: {
                    guestName: { type: 'string', description: 'Name of the guest.' },
                    guestEmail: { type: 'string', description: 'Email of the guest.' },
                    category: { type: 'string', description: 'Category of complaint (e.g., Room, Service, Staff, Food, General).' },
                    description: { type: 'string', description: 'Detailed description of the issue.' }
                },
                required: ['guestName', 'guestEmail', 'category', 'description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'fileEmergencyAlert',
            description: 'Report a critical medical, fire, or security emergency alert for immediate assistance from staff.',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', description: 'Emergency category (Medical, Fire, Security, Other).' },
                    description: { type: 'string', description: 'What is happening.' },
                    contactNumber: { type: 'string', description: 'Immediate contact callback number.' },
                    location: { type: 'string', description: 'Location of the emergency (e.g. Room 102, Lobby).' }
                },
                required: ['type', 'description', 'contactNumber', 'location']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getGuestBookings',
            description: 'Retrieve all existing bookings for a guest by their email address or a specific booking ID to check status or details.',
            parameters: {
                type: 'object',
                properties: {
                    guestEmail: { type: 'string', description: 'Email address of the guest to search for bookings.' },
                    bookingId: { type: 'string', description: 'Optional booking ID (e.g. BK-123) to look up a specific reservation.' }
                }
            }
        }
    }
];

// Tool execution
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
            if (overlaps.length > 0) return { available: false, message: `Room is NOT available for these dates. It conflicts with ${overlaps.length} existing booking(s).` };
            return { available: true, message: 'Room is available for these dates.' };
        }

        if (name === 'createRoomBooking') {
            // Auto-fill from userContext if missing
            if (!args.guestName && userContext?.name) args.guestName = userContext.name;
            if (!args.guestEmail && userContext?.email) args.guestEmail = userContext.email;
            if (!args.guestPhone && userContext?.phone) args.guestPhone = userContext.phone;

            // Resolve roomId if only roomNumber is provided
            if (!args.roomId && args.roomNumber) {
                const rooms = await fetchFirestoreRooms();
                const room = rooms.find((r: any) => String(r.number) === String(args.roomNumber));
                if (room) args.roomId = room.id;
            }

            // Normalize dates
            if (args.checkIn) {
                const normalized = normalizeToYMD(args.checkIn);
                if (!normalized) return { success: false, error: `Invalid check-in date: "${args.checkIn}". Please use a clear date like June 10 or 2026-06-10.` };
                args.checkIn = normalized;
            }
            if (args.checkOut) {
                const normalized = normalizeToYMD(args.checkOut);
                if (!normalized) return { success: false, error: `Invalid check-out date: "${args.checkOut}". Please use a clear date like June 15 or 2026-06-15.` };
                args.checkOut = normalized;
            }

            // Validate dates and calculate price
            if (args.checkIn && args.checkOut) {
                const inDate = new Date(args.checkIn);
                const outDate = new Date(args.checkOut);
                if (outDate <= inDate) return { success: false, error: 'Check-out date must be after check-in date.' };
                if (args.roomId) {
                    const rooms = await fetchFirestoreRooms();
                    const room = rooms.find((r: any) => r.id === args.roomId);
                    if (room) {
                        const nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
                        args.totalPrice = room.price * nights;
                        if (!args.roomNumber) args.roomNumber = room.number;
                        if (!args.roomType) args.roomType = room.type;
                    }
                }
            }

            // Validate required fields
            if (!args.guestName || !args.guestEmail || !args.guestPhone || !args.roomId || !args.checkIn || !args.checkOut) {
                const missing = ['guestName', 'guestEmail', 'guestPhone', 'roomId', 'checkIn', 'checkOut'].filter(f => !args[f]);
                return { success: false, error: `Missing required booking fields: ${missing.join(', ')}.` };
            }

            // ✅ Get payment method
            const paymentMethod = (args.paymentMethod || 'cash').toLowerCase();

            console.log('Creating booking with args:', JSON.stringify(args));

            // Save booking to Firebase
            const bookingRes = await fetch(`${baseUrl}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...args, specialRequests: args.specialRequests || '' }),
            });
            const bookingData = await bookingRes.json();
            if (!bookingData.success) {
                console.error('[createRoomBooking] /api/bookings failed:', bookingData.error);
                return { success: false, error: bookingData.error || 'Failed to save booking.' };
            }

            const savedBooking = bookingData.booking;

            if (paymentMethod === 'online') {
                // ✅ Generate Stripe payment link
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
                if (stripeData.success && stripeData.url) {
                    return {
                        success: true,
                        booking: savedBooking,
                        paymentMethod: 'online',
                        paymentUrl: stripeData.url,
                        message: `✅ Booking created! ID: ${savedBooking.id}\n💰 Total: PKR ${args.totalPrice}\n\n💳 Please complete your payment here:\n${stripeData.url}\n\nAfter payment, you will receive a confirmation email and WhatsApp message with your invoice.`,
                    };
                } else {
                    return { success: false, error: 'Failed to create payment link. Please try again or choose cash payment.' };
                }
            } else {
                // ✅ Cash payment — send to Orchestrator as Pending
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
                    message: `✅ Booking request submitted! ID: ${savedBooking.id}\n💰 Total Due at Hotel: PKR ${args.totalPrice}\n⏳ Status: Pending\n\nPlease pay PKR ${args.totalPrice} at the hotel reception to confirm your booking. Your room will be held for 24 hours.\n\nYou will receive a booking request email and WhatsApp message shortly.`,
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
    const origin = `${proto}://${host}`;

    if (!apiKey) {
        return Response.json({
            message: "Chatbot is offline because the OPENAI_API_KEY environment variable is not configured on the server. Please add it to your .env.local file to activate OpenAI chat features."
        });
    }

    try {
        const { messages, userContext } = await req.json();
        if (!messages || messages.length === 0) {
            return Response.json({ error: 'No messages provided' }, { status: 400 });
        }

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let systemInstruction = 'You are Grand Hotel Assistant, a friendly and professional virtual concierge. ' +
            `Today's date is ${todayStr}. ` +
            'CRITICAL GUIDELINE: You must guide the guest by asking exactly ONE question at a time to gather details. ' +
            'Never ask multiple questions or request multiple pieces of information at once. ' +
            'Keep your responses extremely short, concise, and direct (maximum 1 or 2 sentences). Do not add conversational fluff or long introductions. ' +
            'When a guest wants to book a room, follow this EXACT step order. Never skip a step: ' +
            '1. Ask for their Full Name (even if they are logged in). ' +
            '2. Ask for their Phone Number. ' +
            '3. Ask for their Email Address (skip if user is authenticated). ' +
            '4. Tell them we have 4 types of rooms: Single rooms, Double rooms, Suite rooms, and Presidential rooms. Do NOT add any extra details like price, capacity, or amenities. Just list the 4 names simply, and ask which category they want. ' +
            '5. Ask for the Check-in date. ' +
            '6. Ask for the Check-out date. ' +
            '7. Now that you have the dates, call listAvailableRooms providing the selected category AND the check-in/check-out dates to fetch ONLY the truly available rooms. Since rooms in the same category have the same details, mention the shared details (like amenities and description) ONLY ONCE, and then explicitly list just the available room numbers (e.g. "Available numbers for your dates: 201, 202, 203"). Finally, ask which specific room number they want to select. ' +
            '8. Use the checkRoomAvailability tool just to double check that their selected room is definitively available for those dates. ' +
            '9. If the room is available, ask for the number of Guests. If the room is NOT available, tell them and ask them to pick another room from the available list. ' +
            '10. Ask the guest how they would like to pay: "online" (credit/debit card via secure payment link) or "cash" (pay at hotel reception). ' +
            '11. Finally, call createRoomBooking with all collected information including the paymentMethod. ' +
            '- If paymentMethod is "online": share the payment link from the tool response so the guest can complete payment. Tell them they will receive a confirmation email and WhatsApp after payment. ' +
            '- If paymentMethod is "cash": inform the guest their booking request is submitted as Pending, they need to pay at reception, and they will receive a booking request email and WhatsApp shortly. ' +
            'IMPORTANT DATE RULES: ' +
            '- Always convert guest-provided dates to strict YYYY-MM-DD format (e.g., "June 10" → "2026-06-10", "10/6" → "2026-06-10") before calling createRoomBooking. ' +
            '- If the guest says a date without a year, assume the current year or next year if the date has already passed. ' +
            '- Check-out must be strictly after check-in. If the guest provides invalid dates, ask them to clarify. ' +
            'Follow a similar one-question-at-a-time flow for filing complaints or reporting emergencies. ' +
            'Always rely on the tools to query or make changes to the database rather than making up information. ' +
            'Maintain a polite, helpful concierge tone.';

        if (userContext && userContext.name) {
            systemInstruction += ` The user you are chatting with is currently authenticated as ${userContext.name} (Email: ${userContext.email || 'N/A'}, Role: ${userContext.role || 'customer'}). Skip asking for their Email Address since you already have it, but you MUST still ask for their Full Name and collect the other missing details one by one.`;
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
        let iterations = 0;
        const maxIterations = 5;

        while (keepLooping && iterations < maxIterations) {
            iterations++;
            console.log(`Calling OpenAI API (iteration ${iterations})...`);

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: apiMessages,
                    tools: openAITools,
                    tool_choice: 'auto'
                })
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
                console.log(`OpenAI requested ${assistantMessage.tool_calls.length} tool call(s)`);
                for (const toolCall of assistantMessage.tool_calls) {
                    const { name, arguments: argsString } = toolCall.function;
                    let args = {};
                    try { args = JSON.parse(argsString); } catch (err) { console.error('Failed to parse tool arguments:', argsString); }
                    const toolResult = await executeTool(name, args, origin, userContext);
                    apiMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: name,
                        content: JSON.stringify(toolResult)
                    });
                }
            } else {
                responseText = assistantMessage.content || '';
                keepLooping = false;
            }
        }

        return Response.json({ message: responseText });
    } catch (e: any) {
        console.error('Chat endpoint error:', e);
        return Response.json({ error: e.message || 'An error occurred during chat processing' }, { status: 500 });
    }
}