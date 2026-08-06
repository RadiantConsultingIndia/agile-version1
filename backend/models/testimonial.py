from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base

class Testimonial(Base):
    __tablename__ = "Testimonial"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    program = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False)
    whatsapp = Column(String(20), nullable=False)
    photo_url = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    status = Column(String(20), default="pending")  # pending | approved | rejected
    created_at = Column(DateTime, server_default=func.now())
