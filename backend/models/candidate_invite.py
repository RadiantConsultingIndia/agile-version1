from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class CandidateInvite(Base):
    __tablename__ = "CandidateInvite"

    invite_token = Column(String(64), primary_key=True)
    assessment_id = Column(String(10), ForeignKey("Assessment.assessment_id"), nullable=False)
    candidate_name = Column(String(100), nullable=False)
    candidate_email = Column(String(150), nullable=False)
    status = Column(String(20), default="pending")  # pending / started / completed / expired
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
