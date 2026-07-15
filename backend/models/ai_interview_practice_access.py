from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class AIInterviewPracticeAccess(Base):
    __tablename__ = "AIInterviewPracticeAccess"

    user_id = Column(String(10), ForeignKey("User.user_id"), primary_key=True)
    credits_remaining = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
