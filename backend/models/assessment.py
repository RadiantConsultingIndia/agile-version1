from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from database import Base

class Assessment(Base):
    __tablename__ = "Assessment"

    assessment_id = Column(String(10), primary_key=True)
    employer_user_id = Column(String(10), ForeignKey("User.user_id"), nullable=False)
    title = Column(String(150), nullable=False)
    role_focus = Column(String(30), nullable=False)  # scrum_master / project_manager / product_owner / business_analyst
    status = Column(String(20), default="active")  # active / archived
    require_id_upload = Column(Boolean, default=False)
    jd_text = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    experience_level = Column(String(20), nullable=True)  # fresher / 1-3 / 3-5 / 5+
    num_questions = Column(Integer, default=5)
    duration_minutes = Column(Integer, default=30)
    difficulty = Column(String(10), default="medium")  # easy / medium / hard
    question_style = Column(String(20), default="scenario")  # scenario / situational / short_answer
    created_at = Column(DateTime, server_default=func.now())
