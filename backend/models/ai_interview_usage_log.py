from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class AIInterviewUsageLog(Base):
    __tablename__ = "AIInterviewUsageLog"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(10), ForeignKey("User.user_id"))
    type = Column(String(20))  # 'interview' or 'practice'
    created_at = Column(DateTime, server_default=func.now())
