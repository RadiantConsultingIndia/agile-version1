from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class EmployerJD(Base):
    __tablename__ = "EmployerJD"

    jd_id = Column(String(10), primary_key=True)
    employer_user_id = Column(String(10), ForeignKey("User.user_id"), nullable=False)
    label = Column(String(150), nullable=False)
    jd_text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
