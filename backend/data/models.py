from typing import List, Optional, ClassVar
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, JSON

class User(SQLModel, table=True):
    __tablename__: ClassVar[str] = "users"
    id: str = Field(primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    password: str



class Room(SQLModel, table=True):
    id: str = Field(primary_key=True)
    number: str
    type: str
    price: float
    capacity: int
    amenities: List[str] = Field(sa_column=Column(JSON()))  # type: ignore
    available: bool
    imageUrl: str
    description: str

class Booking(SQLModel, table=True):
    id: str = Field(primary_key=True)
    guestName: str
    guestEmail: str
    guestPhone: str
    roomId: str
    roomNumber: str
    roomType: str
    checkIn: str
    checkOut: str
    guests: int
    totalPrice: float
    status: str
    createdAt: str
    specialRequests: Optional[str] = None

class Complaint(SQLModel, table=True):
    id: str = Field(primary_key=True)
    guestName: str
    guestEmail: str
    category: str
    description: str
    status: str
    createdAt: str
    assignedTo: Optional[str] = None
    notes: Optional[str] = None
    resolvedAt: Optional[str] = None

class Emergency(SQLModel, table=True):
    id: str = Field(primary_key=True)
    type: str
    description: str
    contactNumber: str
    location: str
    status: str
    createdAt: str
    acknowledgedAt: Optional[str] = None
    resolvedAt: Optional[str] = None
    respondedBy: Optional[str] = None

class Feedback(SQLModel, table=True):
    id: str = Field(primary_key=True)
    guestName: str
    guestEmail: str
    rating: int
    comments: str
    createdAt: str

class Activity(SQLModel, table=True):
    id: str = Field(primary_key=True)
    type: str
    description: str
    timestamp: str
    status: Optional[str] = None
