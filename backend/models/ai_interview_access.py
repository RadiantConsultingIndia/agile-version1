from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class AIInterviewAccess(Base):
    __tablename__ = "AIInterviewAccess"

    user_id = Column(String(10), ForeignKey("User.user_id"), primary_key=True)
    has_access = Column(Boolean, default=False)
    credits_remaining = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
