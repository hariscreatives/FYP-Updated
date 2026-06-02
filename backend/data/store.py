"""
PostgreSQL data store using SQLModel.
"""

import copy
import json
import os
from datetime import datetime, timezone
from sqlmodel import Session, select

from data.database import engine
from data.models import User, Room, Booking, Complaint, Emergency, Feedback, Activity
from data.mock_data import mock_analytics

def _to_dict(model_instance):
    if model_instance is None:
        return None
    return model_instance.dict()

def _now_iso(): return datetime.now(tz=timezone.utc).isoformat()
def _now_ms():  return int(datetime.now(tz=timezone.utc).timestamp() * 1000)

# Rooms
def get_rooms():
    with Session(engine) as session:
        return [_to_dict(r) for r in session.exec(select(Room)).all()]

def get_room_by_id(room_id):
    with Session(engine) as session:
        return _to_dict(session.get(Room, room_id))

def update_room(room_id, updates):
    with Session(engine) as session:
        room = session.get(Room, room_id)
        if not room:
            return None
        for k, v in updates.items():
            setattr(room, k, v)
        session.add(room)
        session.commit()
        session.refresh(room)
        return _to_dict(room)

# Bookings
def get_bookings():
    with Session(engine) as session:
        return [_to_dict(b) for b in session.exec(select(Booking)).all()]

def get_booking_by_id(bid):
    with Session(engine) as session:
        return _to_dict(session.get(Booking, bid))

def add_booking(booking):
    if "id" not in booking:
        booking["id"] = f"BK-{_now_ms()}"
    
    # Ensure properties that might not be in dict are handled
    db_booking = Booking(**booking)
    with Session(engine) as session:
        session.add(db_booking)
        session.commit()
        session.refresh(db_booking)
    
    room = get_room_by_id(booking.get("roomId", ""))
    if room:
        update_room(booking["roomId"], {"available": False})
        
    add_activity({
        "id": f"act-{_now_ms()}",
        "type": "booking",
        "description": f"New booking by {booking.get('guestName')} for Room {booking.get('roomNumber')}",
        "timestamp": _now_iso(),
        "status": booking.get("status")
    })
    return _to_dict(db_booking)

def update_booking(bid, updates):
    with Session(engine) as session:
        booking = session.get(Booking, bid)
        if not booking:
            return None
        for k, v in updates.items():
            setattr(booking, k, v)
        session.add(booking)
        session.commit()
        session.refresh(booking)
        return _to_dict(booking)

# Complaints
def get_complaints():
    with Session(engine) as session:
        return [_to_dict(c) for c in session.exec(select(Complaint)).all()]

def get_complaint_by_id(cid):
    with Session(engine) as session:
        return _to_dict(session.get(Complaint, cid))

def add_complaint(complaint):
    if "id" not in complaint:
        complaint["id"] = f"CMP-{_now_ms()}"
    db_complaint = Complaint(**complaint)
    with Session(engine) as session:
        session.add(db_complaint)
        session.commit()
        session.refresh(db_complaint)
    
    add_activity({
        "id": f"act-{_now_ms()}",
        "type": "complaint",
        "description": f"New complaint: {complaint.get('category')} - {str(complaint.get('description',''))[:50]}",
        "timestamp": _now_iso(),
        "status": complaint.get("status")
    })
    return _to_dict(db_complaint)

def update_complaint(cid, updates):
    with Session(engine) as session:
        complaint = session.get(Complaint, cid)
        if not complaint:
            return None
        for k, v in updates.items():
            setattr(complaint, k, v)
        session.add(complaint)
        session.commit()
        session.refresh(complaint)
        return _to_dict(complaint)

# Emergencies
def get_emergencies():
    with Session(engine) as session:
        return [_to_dict(e) for e in session.exec(select(Emergency)).all()]

def get_emergency_by_id(eid):
    with Session(engine) as session:
        return _to_dict(session.get(Emergency, eid))

def add_emergency(emergency):
    if "id" not in emergency:
        emergency["id"] = f"EMG-{_now_ms()}"
    db_emergency = Emergency(**emergency)
    with Session(engine) as session:
        session.add(db_emergency)
        session.commit()
        session.refresh(db_emergency)
    
    add_activity({
        "id": f"act-{_now_ms()}",
        "type": "emergency",
        "description": f"{emergency.get('type')} emergency: {emergency.get('description')}",
        "timestamp": _now_iso(),
        "status": emergency.get("status")
    })
    return _to_dict(db_emergency)

def update_emergency(eid, updates):
    with Session(engine) as session:
        emergency = session.get(Emergency, eid)
        if not emergency:
            return None
        for k, v in updates.items():
            setattr(emergency, k, v)
        session.add(emergency)
        session.commit()
        session.refresh(emergency)
        return _to_dict(emergency)

# Feedback
def get_feedback():
    with Session(engine) as session:
        return [_to_dict(f) for f in session.exec(select(Feedback)).all()]

def add_feedback(fb):
    if "id" not in fb:
        fb["id"] = f"FB-{_now_ms()}"
    db_feedback = Feedback(**fb)
    with Session(engine) as session:
        session.add(db_feedback)
        session.commit()
        session.refresh(db_feedback)
    return _to_dict(db_feedback)

# Users
def get_users():
    with Session(engine) as session:
        return [_to_dict(u) for u in session.exec(select(User)).all()]

def get_user_by_id(uid):
    with Session(engine) as session:
        return _to_dict(session.get(User, uid))

def get_user_by_email(email):
    with Session(engine) as session:
        return _to_dict(session.exec(select(User).where(User.email == email)).first())

def add_user(user):
    if "id" not in user:
        user["id"] = f"user-{_now_ms()}"
    db_user = User(**user)
    with Session(engine) as session:
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return _to_dict(db_user)

def update_user(uid, updates):
    with Session(engine) as session:
        user = session.get(User, uid)
        if not user:
            return None
        for k, v in updates.items():
            setattr(user, k, v)
        session.add(user)
        session.commit()
        session.refresh(user)
        return _to_dict(user)

def delete_user(uid):
    with Session(engine) as session:
        user = session.get(User, uid)
        if not user:
            return False
        session.delete(user)
        session.commit()
        return True

# Staff aliases
def get_staff():
    with Session(engine) as session:
        staff_members = session.exec(select(User).where(User.role.in_(["Staff", "Admin"]))).all()
        return [_to_dict(s) for s in staff_members]

get_staff_by_id = get_user_by_id
add_staff    = add_user
update_staff = update_user
delete_staff = delete_user

# Activity
def get_activity():
    with Session(engine) as session:
        return [_to_dict(a) for a in session.exec(select(Activity).order_by(Activity.timestamp.desc())).all()]

def add_activity(item):
    if "id" not in item:
        item["id"] = f"act-{_now_ms()}"
    db_activity = Activity(**item)
    with Session(engine) as session:
        session.add(db_activity)
        session.commit()
        session.refresh(db_activity)
    return _to_dict(db_activity)

# Analytics
def get_analytics():
    now = datetime.now(tz=timezone.utc)
    
    with Session(engine) as session:
        complaints = session.exec(select(Complaint)).all()
        emergencies = session.exec(select(Emergency)).all()
        rooms = session.exec(select(Room)).all()
        bookings = session.exec(select(Booking)).all()
        feedback = session.exec(select(Feedback)).all()
        
    complaints_counts = [
        {"status": "New",         "count": sum(1 for c in complaints if c.status == "New")},
        {"status": "In Progress", "count": sum(1 for c in complaints if c.status == "In Progress")},
        {"status": "Resolved",    "count": sum(1 for c in complaints if c.status == "Resolved")},
    ]
    emergency_counts = [{"type": t, "count": sum(1 for e in emergencies if e.type == t)} for t in ("Medical", "Fire", "Security", "Other")]
    total_rooms  = len(rooms)
    
    booked_rooms = 0
    for b in bookings:
        try:
            if b.status == "Confirmed" and datetime.fromisoformat(b.checkOut).replace(tzinfo=timezone.utc) > now:
                booked_rooms += 1
        except Exception:
            pass
            
    occupancy_rate = round((booked_rooms / total_rooms) * 100, 1) if total_rooms else 0
    avg_rating = round(sum(f.rating for f in feedback) / len(feedback), 1) if feedback else mock_analytics["avgRating"]
    
    return {
        "bookingsByMonth": mock_analytics["bookingsByMonth"],
        "complaintsCounts": complaints_counts,
        "emergencyCounts": emergency_counts,
        "occupancyRate": occupancy_rate,
        "avgRating": avg_rating
    }
