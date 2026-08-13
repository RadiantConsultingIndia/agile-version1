from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from database import Base

class CandidateResult(Base):
    __tablename__ = "CandidateResult"

    result_id = Column(String(10), primary_key=True)
    invite_token = Column(String(64), ForeignKey("CandidateInvite.invite_token"), nullable=False, unique=True)
    transcript_json = Column(Text)
    overall_score = Column(Integer)
    recommendation = Column(String(30))  # Strong Match / Consider / Needs Further Evaluation / Not Recommended
    summary = Column(Text)
    strengths_json = Column(Text)
    gaps_json = Column(Text)
    per_question_notes_json = Column(Text)
    integrity_notes_json = Column(Text)
    competency_scores_json = Column(Text)
    paste_count = Column(Integer, default=0)
    paste_suspicious_count = Column(Integer, default=0)
    tab_switch_count = Column(Integer, default=0)
    fast_answer_count = Column(Integer, default=0)
    timed_out = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
