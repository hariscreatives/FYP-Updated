import os
import json
from sqlmodel import Session, select
from data.database import engine
from data.models import User, Room, Booking, Complaint, Emergency, Feedback, Activity
from data.mock_data import (
    mock_rooms, mock_bookings, mock_complaints, mock_emergencies,
    mock_staff, mock_feedback, mock_activity
)

def seed_db():
    with Session(engine) as session:
        # Check if users already exist
        existing_users = session.exec(select(User)).first()
        if not existing_users:
            users_file = os.path.join(os.path.dirname(__file__), "users.json")
            users_list = []
            if os.path.exists(users_file):
                try:
                    with open(users_file, "r", encoding="utf-8") as f:
                        users_list = json.load(f)
                except Exception as exc:
                    print(f"Error loading users.json: {exc}")
            
            if not users_list:
                # Fallback to mock_staff
                users_list = [
                    {**s, "password": "admin123" if s["role"] == "Admin" else "staff123"}
                    for s in mock_staff
                ]
            
            for u in users_list:
                # Handle unexpected keys from users.json, only keep attributes present in User model
                user_data = {
                    "id": u.get("id"),
                    "name": u.get("name"),
                    "email": u.get("email"),
                    "role": u.get("role"),
                    "department": u.get("department"),
                    "phone": u.get("phone"),
                    "password": u.get("password")
                }
                session.add(User(**user_data))
            print("Seeded Users table.")

        # Seed Rooms
        if not session.exec(select(Room)).first():
            for r in mock_rooms:
                session.add(Room(**r))
            print("Seeded Rooms table.")

        # Seed Bookings
        if not session.exec(select(Booking)).first():
            for b in mock_bookings:
                session.add(Booking(**b))
            print("Seeded Bookings table.")

        # Seed Complaints
        if not session.exec(select(Complaint)).first():
            for c in mock_complaints:
                session.add(Complaint(**c))
            print("Seeded Complaints table.")

        # Seed Emergencies
        if not session.exec(select(Emergency)).first():
            for e in mock_emergencies:
                session.add(Emergency(**e))
            print("Seeded Emergencies table.")

        # Seed Feedback
        if not session.exec(select(Feedback)).first():
            for f in mock_feedback:
                session.add(Feedback(**f))
            print("Seeded Feedback table.")

        # Seed Activity
        if not session.exec(select(Activity)).first():
            for a in mock_activity:
                session.add(Activity(**a))
            print("Seeded Activity table.")

        session.commit()
