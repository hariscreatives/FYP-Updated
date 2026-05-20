// In-memory data store for the hotel management system
// This simulates a database for the demo application

const { mockRooms, mockBookings, mockComplaints, mockEmergencies, mockFeedback, mockStaff, mockActivity, mockAnalytics } = require('./mockData');

// Initialize data store
let rooms = JSON.parse(JSON.stringify(mockRooms));
let bookings = JSON.parse(JSON.stringify(mockBookings));
let complaints = JSON.parse(JSON.stringify(mockComplaints));
let emergencies = JSON.parse(JSON.stringify(mockEmergencies));
let feedback = JSON.parse(JSON.stringify(mockFeedback));
let staff = JSON.parse(JSON.stringify(mockStaff));
let activity = JSON.parse(JSON.stringify(mockActivity));

// Room operations
const getRooms = () => rooms;
const getRoomById = (id) => rooms.find(room => room.id === id);
const updateRoom = (id, updates) => {
    const index = rooms.findIndex(room => room.id === id);
    if (index !== -1) {
        rooms[index] = { ...rooms[index], ...updates };
        return rooms[index];
    }
    return null;
};

// Booking operations
const getBookings = () => bookings;
const getBookingById = (id) => bookings.find(booking => booking.id === id);
const addBooking = (booking) => {
    bookings.push(booking);
    // Update room availability
    const room = getRoomById(booking.roomId);
    if (room) {
        updateRoom(booking.roomId, { available: false });
    }
    // Add activity
    addActivity({
        id: `act-${Date.now()}`,
        type: 'booking',
        description: `New booking by ${booking.guestName} for Room ${booking.roomNumber}`,
        timestamp: new Date().toISOString(),
        status: booking.status
    });
    return booking;
};
const updateBooking = (id, updates) => {
    const index = bookings.findIndex(booking => booking.id === id);
    if (index !== -1) {
        bookings[index] = { ...bookings[index], ...updates };
        return bookings[index];
    }
    return null;
};

// Complaint operations
const getComplaints = () => complaints;
const getComplaintById = (id) => complaints.find(complaint => complaint.id === id);
const addComplaint = (complaint) => {
    complaints.push(complaint);
    addActivity({
        id: `act-${Date.now()}`,
        type: 'complaint',
        description: `New complaint: ${complaint.category} - ${complaint.description.substring(0, 50)}`,
        timestamp: new Date().toISOString(),
        status: complaint.status
    });
    return complaint;
};
const updateComplaint = (id, updates) => {
    const index = complaints.findIndex(complaint => complaint.id === id);
    if (index !== -1) {
        complaints[index] = { ...complaints[index], ...updates };
        return complaints[index];
    }
    return null;
};

// Emergency operations
const getEmergencies = () => emergencies;
const getEmergencyById = (id) => emergencies.find(emergency => emergency.id === id);
const addEmergency = (emergency) => {
    emergencies.push(emergency);
    addActivity({
        id: `act-${Date.now()}`,
        type: 'emergency',
        description: `${emergency.type} emergency: ${emergency.description}`,
        timestamp: new Date().toISOString(),
        status: emergency.status
    });
    return emergency;
};
const updateEmergency = (id, updates) => {
    const index = emergencies.findIndex(emergency => emergency.id === id);
    if (index !== -1) {
        emergencies[index] = { ...emergencies[index], ...updates };
        return emergencies[index];
    }
    return null;
};

// Feedback operations
const getFeedback = () => feedback;
const addFeedback = (fb) => {
    feedback.push(fb);
    return fb;
};

// Staff operations
const getStaff = () => staff;
const getStaffById = (id) => staff.find(s => s.id === id);
const addStaff = (member) => {
    staff.push(member);
    return member;
};
const updateStaff = (id, updates) => {
    const index = staff.findIndex(s => s.id === id);
    if (index !== -1) {
        staff[index] = { ...staff[index], ...updates };
        return staff[index];
    }
    return null;
};
const deleteStaff = (id) => {
    const index = staff.findIndex(s => s.id === id);
    if (index !== -1) {
        staff.splice(index, 1);
        return true;
    }
    return false;
};

// Activity operations
const getActivity = () => activity;
const addActivity = (item) => {
    activity.unshift(item); // Add to beginning
    // Keep only last 100 activities
    if (activity.length > 100) {
        activity = activity.slice(0, 100);
    }
    return item;
};

// Analytics
const getAnalytics = () => {
    // Calculate real-time analytics from current data
    const bookingsByMonth = mockAnalytics.bookingsByMonth;
    const complaintsCounts = [
        { status: 'New', count: complaints.filter(c => c.status === 'New').length },
        { status: 'In Progress', count: complaints.filter(c => c.status === 'In Progress').length },
        { status: 'Resolved', count: complaints.filter(c => c.status === 'Resolved').length }
    ];
    const emergencyCounts = [
        { type: 'Medical', count: emergencies.filter(e => e.type === 'Medical').length },
        { type: 'Fire', count: emergencies.filter(e => e.type === 'Fire').length },
        { type: 'Security', count: emergencies.filter(e => e.type === 'Security').length },
        { type: 'Other', count: emergencies.filter(e => e.type === 'Other').length }
    ];
    
    // Calculate occupancy rate (simplified)
    const totalRooms = rooms.length;
    const bookedRooms = bookings.filter(b => b.status === 'Confirmed' && new Date(b.checkOut) > new Date()).length;
    const occupancyRate = (bookedRooms / totalRooms) * 100;
    
    // Calculate average rating
    const avgRating = feedback.length > 0 
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length 
        : mockAnalytics.avgRating;
    
    return {
        bookingsByMonth,
        complaintsCounts,
        emergencyCounts,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        avgRating: Math.round(avgRating * 10) / 10
    };
};

module.exports = {
    // Rooms
    getRooms,
    getRoomById,
    updateRoom,
    
    // Bookings
    getBookings,
    getBookingById,
    addBooking,
    updateBooking,
    
    // Complaints
    getComplaints,
    getComplaintById,
    addComplaint,
    updateComplaint,
    
    // Emergencies
    getEmergencies,
    getEmergencyById,
    addEmergency,
    updateEmergency,
    
    // Feedback
    getFeedback,
    addFeedback,
    
    // Staff
    getStaff,
    getStaffById,
    addStaff,
    updateStaff,
    deleteStaff,
    
    // Activity
    getActivity,
    
    // Analytics
    getAnalytics
};
