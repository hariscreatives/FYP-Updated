// In-memory data store for the hotel management system
// This simulates a database for the demo application

const fs = require('fs');
const path = require('path');
const { mockRooms, mockBookings, mockComplaints, mockEmergencies, mockFeedback, mockStaff, mockActivity, mockAnalytics } = require('./mockData');

// Initialize data store
let rooms = JSON.parse(JSON.stringify(mockRooms));
let bookings = JSON.parse(JSON.stringify(mockBookings));
let complaints = JSON.parse(JSON.stringify(mockComplaints));
let emergencies = JSON.parse(JSON.stringify(mockEmergencies));
let feedback = JSON.parse(JSON.stringify(mockFeedback));
let activity = JSON.parse(JSON.stringify(mockActivity));

const USERS_FILE = path.join(__dirname, 'users.json');
let users = [];

// Load users from file or mock data
try {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } else {
        // Initialize with mockStaff but add password field for login
        users = JSON.parse(JSON.stringify(mockStaff)).map(s => ({
            ...s,
            password: s.role === 'Admin' ? 'admin123' : 'staff123'
        }));
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
} catch (error) {
    console.error('Error loading users:', error);
    users = [];
}

const saveUsers = () => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
};

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

// User operations (replaces Staff operations)
const getUsers = () => users;
const getUserById = (id) => users.find(u => u.id === id);
const getUserByEmail = (email) => users.find(u => u.email === email);
const addUser = (user) => {
    users.push(user);
    saveUsers();
    return user;
};
const updateUser = (id, updates) => {
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        saveUsers();
        return users[index];
    }
    return null;
};
const deleteUser = (id) => {
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
        users.splice(index, 1);
        saveUsers();
        return true;
    }
    return false;
};

// Aliases for staff routes backward compatibility
const getStaff = () => users.filter(u => u.role === 'Staff' || u.role === 'Admin');
const getStaffById = getUserById;
const addStaff = addUser;
const updateStaff = updateUser;
const deleteStaff = deleteUser;

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
    
    // Users
    getUsers,
    getUserById,
    getUserByEmail,
    addUser,
    updateUser,
    deleteUser,
    
    // Staff (Aliases)
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
