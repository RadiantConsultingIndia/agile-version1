from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class EmployerProfile(Base):
    __tablename__ = "EmployerProfile"

    employer_profile_id = Column(String(10), primary_key=True)
    user_id = Column(String(10), ForeignKey("User.user_id"), nullable=False)
    company_name = Column(String(150), nullable=False)
    industry = Column(String(100), nullable=True)
    company_size = Column(String(20), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
