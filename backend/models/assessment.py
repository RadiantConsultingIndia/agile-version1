from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
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
    created_at = Column(DateTime, server_default=func.now())
