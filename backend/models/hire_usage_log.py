from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class HireUsageLog(Base):
    __tablename__ = "HireUsageLog"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employer_user_id = Column(String(10), ForeignKey("User.user_id"))
    assessment_id = Column(String(10), ForeignKey("Assessment.assessment_id"))
    invite_token = Column(String(64), ForeignKey("CandidateInvite.invite_token"))
    event_type = Column(String(20))  # invite_sent / candidate_started / candidate_completed
    created_at = Column(DateTime, server_default=func.now())
