from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class EmployerProfile(Base):
    __tablename__ = "EmployerProfile"

    employer_profile_id = Column(String(10), primary_key=True)
    user_id = Column(String(10), ForeignKey("User.user_id"), nullable=False)
    company_name = Column(String(150), nullable=False)
    industry = Column(String(100), nullable=True)
    company_size = Column(String(20), nullable=True)
    logo_url = Column(String(500), nullable=True)
    website = Column(String(300), nullable=True)
    location = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    linkedin_url = Column(String(300), nullable=True)
    contact_email = Column(String(150), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
