# Hotel Management API - Node.js Backend

This is the Node.js/Express backend API for the Hotel Management System.

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### Running the Server

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001` by default.

## 📡 API Endpoints

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room by ID
- `PATCH /api/rooms/:id` - Update room (availability, etc.)

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/:id` - Update booking

### Complaints
- `GET /api/complaints` - Get all complaints
- `GET /api/complaints/:id` - Get complaint by ID
- `POST /api/complaints` - Create new complaint
- `PATCH /api/complaints/:id` - Update complaint

### Emergencies
- `GET /api/emergencies` - Get all emergencies
- `GET /api/emergencies/:id` - Get emergency by ID
- `POST /api/emergencies` - Create new emergency
- `PATCH /api/emergencies/:id` - Update emergency

### Feedback
- `GET /api/feedback` - Get all feedback
- `POST /api/feedback` - Create new feedback

### Staff
- `GET /api/staff` - Get all staff members
- `GET /api/staff/:id` - Get staff by ID
- `POST /api/staff` - Create new staff member
- `PATCH /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Authentication
- `POST /api/auth/login` - Login (email, password)
- `GET /api/auth/verify` - Verify token

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/analytics/activity` - Get activity feed

### Health Check
- `GET /api/health` - Check API health status

## 🔐 Demo Credentials

### Admin
- Email: `admin@grandhotel.com`
- Password: `admin123`

### Staff
- Email: `alice@grandhotel.com`
- Password: `staff123`

## 📦 Project Structure

```
backend/
├── data/
│   ├── mockData.js      # Initial mock data
│   └── store.js         # In-memory data store with CRUD operations
├── routes/
│   ├── rooms.js         # Room routes
│   ├── bookings.js      # Booking routes
│   ├── complaints.js    # Complaint routes
│   ├── emergencies.js   # Emergency routes
│   ├── feedback.js      # Feedback routes
│   ├── staff.js         # Staff routes
│   ├── auth.js          # Authentication routes
│   └── analytics.js     # Analytics routes
├── server.js            # Express server setup
└── package.json         # Dependencies and scripts
```

## 🔧 Configuration

The server can be configured using environment variables:

- `PORT` - Server port (default: 3001)

Example:
```bash
PORT=3001 npm start
```

## 📝 Notes

- **In-Memory Storage**: Data is stored in memory and resets on server restart
- **CORS Enabled**: CORS is enabled for all origins (for demo purposes)
- **Mock Authentication**: Authentication is simplified for demo purposes
- **No Database**: Uses in-memory data store (can be replaced with a database)

## 🔄 Next Steps

To make this production-ready:
1. Add a database (MongoDB, PostgreSQL, etc.)
2. Implement proper JWT authentication
3. Add input validation and sanitization
4. Add rate limiting
5. Add logging and error tracking
6. Add API documentation (Swagger/OpenAPI)
