import os
import re
import json
import csv
import io
import secrets
import random
import threading
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, Depends, Cookie, HTTPException, File, UploadFile, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel, field_validator
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler

from security import hash_password, verify_password, create_access_token, decode_access_token
from database import get_db
from models.user import User
from models.mentor_invite import MentorInvite
from models.mentor import Mentor
from models.program import Program
from models.enrollment import Enrollment
from models.session import Session as MentorSession
from models.attendance import Attendance
from cloudinary_config import upload_file
from models.mentor_certificate import MentorCertificate
from models.video_progress import VideoProgress
from models.session_completion import SessionCompletion
from models.password_reset_token import PasswordResetToken
from models.feedback import Feedback
from models.resource import Resource
from models.email_otp import EmailOTP
from models.notification import Notification
from email_service import (
    send_email, forgot_password_email, session_created_email,
    session_reminder_email, enrollment_confirmation_email, otp_verification_email,
    enrollment_request_admin_email, enrollment_approved_email, enrollment_rejected_email,
    certificate_earned_email,
)

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in FRONTEND_URL.split(",") if o.strip()]
PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = BackgroundScheduler(daemon=True)
scheduler.start()

@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown(wait=False)


# ── VALIDATIONS ───────────────────────────────────────────────────────────────

ALLOWED_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "ac.in", "edu.in"]

def validate_email(email: str) -> bool:
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w{2,}$'
    if not re.match(pattern, email):
        return False
    domain = email.split("@")[1].lower()
    return any(domain == d or domain.endswith("." + d) for d in ALLOWED_DOMAINS)

def validate_password(password: str) -> bool:
    return len(password) >= 6 and password[0].isupper()


# ── ID GENERATORS ─────────────────────────────────────────────────────────────
# All ID generators: MAX+1 with a uniqueness check loop as final safety net

def _unique_id(db, model, pk_attr, prefix: str, width: int) -> str:
    max_id = db.query(func.max(pk_attr)).filter(pk_attr.like(f"{prefix}%")).scalar()
    try:
        count = (int(max_id[len(prefix):]) + 1) if max_id else 1
    except (ValueError, TypeError):
        count = 1
    while True:
        candidate = f"{prefix}{count:0{width}d}"
        if not db.query(model).filter(pk_attr == candidate).first():
            return candidate
        count += 1

def generate_user_id(db) -> str:
    year = str(datetime.now().year)[2:]
    max_id = db.query(func.max(User.user_id)).filter(User.user_id.like(f"{year}%")).scalar()
    try:
        count = (int(max_id[2:]) + 1) if max_id else 1
    except (ValueError, TypeError):
        count = 1
    while True:
        candidate = f"{year}{count:03d}"
        if not db.query(User).filter(User.user_id == candidate).first():
            return candidate
        count += 1

def generate_mentor_id(db) -> str:
    return _unique_id(db, Mentor, Mentor.mentor_profile_id, "MTR", 4)

def generate_program_id(db) -> str:
    return _unique_id(db, Program, Program.program_id, "PRG", 4)

def generate_invite_id(db) -> str:
    return _unique_id(db, MentorInvite, MentorInvite.invite_id, "INV", 4)

def generate_enrollment_id(db, program_title: str = "") -> str:
    year = str(datetime.now().year)[2:]
    raw = "".join(c for c in program_title if c.isalpha())
    code = raw[:2].upper() if len(raw) >= 2 else (raw.upper() + "X")[:2]
    max_id = db.query(func.max(Enrollment.enrollment_id)).filter(Enrollment.enrollment_id.like(f"{year}%")).scalar()
    try:
        count = (int(max_id[-4:]) + 1) if max_id else 1
    except (ValueError, TypeError):
        count = 1
    while True:
        candidate = f"{year}{code}{count:04d}"
        if not db.query(Enrollment).filter(Enrollment.enrollment_id == candidate).first():
            return candidate
        count += 1

def generate_session_id(db) -> str:
    return _unique_id(db, MentorSession, MentorSession.session_id, "SES", 4)

def generate_attendance_id(db) -> str:
    return _unique_id(db, Attendance, Attendance.attendance_id, "ATT", 4)

def generate_cert_id(db) -> str:
    return _unique_id(db, MentorCertificate, MentorCertificate.cert_id, "CRT", 4)

def generate_resource_id(db) -> str:
    return _unique_id(db, Resource, Resource.resource_id, "RES", 4)

def generate_otp_id(db) -> str:
    return _unique_id(db, EmailOTP, EmailOTP.otp_id, "OTP", 4)

def generate_progress_id(db) -> str:
    return _unique_id(db, VideoProgress, VideoProgress.progress_id, "VP", 4)

def generate_completion_id(db) -> str:
    return _unique_id(db, SessionCompletion, SessionCompletion.completion_id, "SC", 4)

def generate_feedback_id(db) -> str:
    return _unique_id(db, Feedback, Feedback.feedback_id, "FB", 4)

def generate_notification_id(db) -> str:
    return _unique_id(db, Notification, Notification.notification_id, "NT", 4)

def _notify(user_id: str, title: str, message: str, notif_type: str, link: str, db):
    try:
        notif = Notification(
            notification_id=generate_notification_id(db),
            user_id=user_id,
            title=title,
            message=message,
            notif_type=notif_type,
            is_read=False,
            link=link,
        )
        db.add(notif)
        db.commit()
    except Exception:
        db.rollback()


# ── AUTH HELPER ───────────────────────────────────────────────────────────────

def get_current_user(access_token: str = Cookie(None), db: Session = Depends(get_db)):
    if not access_token:
        return None
    payload = decode_access_token(access_token)
    if not payload:
        return None
    return db.query(User).filter(User.user_id == payload.get("user_id")).first()

def require_user(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_mentor(current_user: User = Depends(get_current_user)):
    if not current_user or current_user.role != "mentor":
        raise HTTPException(status_code=403, detail="Mentor access required")
    return current_user

def require_mentee(current_user: User = Depends(get_current_user)):
    if not current_user or current_user.role != "mentee":
        raise HTTPException(status_code=403, detail="Mentee access required")
    return current_user


# ── PYDANTIC REQUEST MODELS ───────────────────────────────────────────────────

class SignupBody(BaseModel):
    full_name: str
    email: str
    password: str
    invite_code: Optional[str] = None

class LoginBody(BaseModel):
    email: str
    password: str

class VerifyEmailBody(BaseModel):
    user_id: str
    otp_code: str

class ResendOTPBody(BaseModel):
    user_id: str

class ForgotPasswordBody(BaseModel):
    email: str

class ResetPasswordBody(BaseModel):
    token: str
    password: str
    confirm_password: str

class UpdateMentorProfileBody(BaseModel):
    expertise: Optional[str] = None
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None

class CreateProgramBody(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    duration_weeks: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    assigned_mentor: Optional[str] = None
    cover_image: Optional[str] = None

class UpdateProgramBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    duration_weeks: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    assigned_mentor: Optional[str] = None
    status: Optional[str] = None
    cover_image: Optional[str] = None

class CreateSessionBody(BaseModel):
    program_id: str
    mentor_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    session_type: str
    scheduled_at: Optional[str] = None
    meeting_link: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    cover_image: Optional[str] = None

    @field_validator('mentor_id', 'description', 'scheduled_at', 'meeting_link', 'video_url', 'cover_image', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        return None if v == '' else v

    @field_validator('duration_minutes', mode='before')
    @classmethod
    def parse_duration(cls, v):
        if v == '' or v is None:
            return None
        return int(v)

class UpdateSessionBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[str] = None
    meeting_link: Optional[str] = None
    video_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    cover_image: Optional[str] = None

    @field_validator('description', 'scheduled_at', 'meeting_link', 'video_url', 'status', 'cover_image', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        return None if v == '' else v

    @field_validator('duration_minutes', mode='before')
    @classmethod
    def parse_duration(cls, v):
        if v == '' or v is None:
            return None
        return int(v)

class GenerateInviteBody(BaseModel):
    mentor_email: str

class MarkAttendanceBody(BaseModel):
    user_id: str
    status: str

class VideoSegmentBody(BaseModel):
    session_id: str
    start: float
    end: float
    video_duration_seconds: float = 0

class FeedbackBody(BaseModel):
    rating: int
    comments: str = ""

# ── SESSION REMINDER (APScheduler) ────────────────────────────────────────────

def schedule_session_reminder(session_id, session_title, program_title,
                               scheduled_at_dt, meeting_link, mentee_list, minutes_before=30):
    reminder_time = scheduled_at_dt - timedelta(minutes=minutes_before)
    if reminder_time <= datetime.now(timezone.utc):
        return
    scheduled_str = scheduled_at_dt.strftime("%d %b %Y, %I:%M %p")

    def send_reminders():
        for full_name, email in mentee_list:
            html = session_reminder_email(
                full_name=full_name, session_title=session_title,
                program_title=program_title, scheduled_at=scheduled_str,
                meeting_link=meeting_link, minutes_before=minutes_before,
            )
            send_email(email, f"⏰ Reminder: '{session_title}' starts in {minutes_before} mins", html)

    scheduler.add_job(send_reminders, trigger="date", run_date=reminder_time, misfire_grace_time=300)


# ── FILE TYPE DETECTION ───────────────────────────────────────────────────────

def detect_file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "file"
    mapping = {
        "pdf": "pdf", "ppt": "ppt", "pptx": "ppt", "doc": "doc", "docx": "doc",
        "xls": "excel", "xlsx": "excel",
        "jpg": "image", "jpeg": "image", "png": "image", "gif": "image", "webp": "image",
        "mp4": "video", "mov": "video", "avi": "video", "mkv": "video", "txt": "txt",
    }
    return mapping.get(ext, "file")


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/me")
def get_me(current_user: User = Depends(require_user)):
    return {
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "profile_photo": current_user.profile_photo,
    }

@app.post("/api/auth/signup/{role}")
def signup(role: str, body: SignupBody, db: Session = Depends(get_db)):
    if role.lower() == "admin":
        raise HTTPException(status_code=403, detail="Admin accounts cannot be created publicly.")

    if role == "mentor":
        if not body.invite_code:
            raise HTTPException(status_code=400, detail="Invite code is required for mentor signup")
        invite = db.query(MentorInvite).filter(
            MentorInvite.invite_code == body.invite_code.upper(),
            MentorInvite.is_used == False,
            or_(MentorInvite.expires_at == None, MentorInvite.expires_at > datetime.now(timezone.utc))
        ).first()
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid, already used, or expired invite code")

    if not validate_email(body.email):
        raise HTTPException(status_code=400, detail="Invalid email. Use gmail.com, yahoo.com, ac.in etc.")
    if not validate_password(body.password):
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters and start with a capital letter")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = generate_user_id(db)
    user = User(
        user_id=user_id, full_name=body.full_name, email=body.email,
        password_hash=hash_password(body.password), role=role.lower(), status="unverified"
    )
    db.add(user)
    db.flush()

    if role == "mentor":
        mentor = Mentor(mentor_profile_id=generate_mentor_id(db), user_id=user_id)
        db.add(mentor)
        invite.is_used = True
        invite.used_by = user_id

    otp_code = str(random.randint(100000, 999999))
    otp = EmailOTP(
        otp_id=generate_otp_id(db), user_id=user_id, otp_code=otp_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    db.add(otp)
    db.commit()

    html = otp_verification_email(full_name=body.full_name, otp_code=otp_code)
    threading.Thread(target=send_email, args=(body.email, "🔐 Verify your AgileMentor account", html)).start()

    return {"success": True, "user_id": user_id, "email": body.email}

@app.post("/api/auth/login/{role}")
@limiter.limit("5/minute")
def login(role: str, request: Request, body: LoginBody, db: Session = Depends(get_db)):
    if not validate_email(body.email):
        raise HTTPException(status_code=400, detail="Invalid email")
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != role.lower():
        raise HTTPException(status_code=403, detail="Invalid role for this account")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    if user.status == "unverified":
        raise HTTPException(status_code=403, detail="Please verify your email first",
                            headers={"X-User-Id": user.user_id, "X-User-Email": user.email})

    token = create_access_token(data={"user_id": user.user_id, "role": user.role, "email": user.email})
    response = JSONResponse({
        "success": True,
        "user": {
            "user_id": user.user_id, "full_name": user.full_name,
            "email": user.email, "role": user.role,
            "profile_photo": user.profile_photo,
        }
    })
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="none" if PRODUCTION else "lax", secure=PRODUCTION)
    return response

@app.post("/api/auth/logout")
def logout():
    response = JSONResponse({"success": True})
    response.delete_cookie("access_token", samesite="none" if PRODUCTION else "lax", secure=PRODUCTION)
    return response

@app.post("/api/auth/verify-email")
@limiter.limit("10/minute")
def verify_email(request: Request, body: VerifyEmailBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = db.query(EmailOTP).filter(
        EmailOTP.user_id == body.user_id,
        EmailOTP.otp_code == body.otp_code,
        EmailOTP.is_used == False
    ).order_by(EmailOTP.created_at.desc()).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if datetime.now(timezone.utc) > otp.expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired")

    otp.is_used = True
    user.status = "active"
    db.commit()
    return {"success": True, "role": user.role}

@app.post("/api/auth/resend-otp")
@limiter.limit("5/minute")
def resend_otp(request: Request, body: ResendOTPBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(EmailOTP).filter(EmailOTP.user_id == body.user_id, EmailOTP.is_used == False).update({"is_used": True})

    otp_code = str(random.randint(100000, 999999))
    otp = EmailOTP(
        otp_id=generate_otp_id(db), user_id=body.user_id, otp_code=otp_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    db.add(otp)
    db.commit()

    html = otp_verification_email(full_name=user.full_name, otp_code=otp_code)
    threading.Thread(target=send_email, args=(user.email, "🔐 Your new AgileMentor OTP", html)).start()
    return {"success": True}

@app.post("/api/auth/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.user_id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True}, synchronize_session=False)

        token = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            token=token, user_id=user.user_id, is_used=False,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30)
        )
        db.add(reset_token)
        db.commit()

        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        html = forgot_password_email(user.full_name, reset_link)
        threading.Thread(target=send_email, args=(user.email, "Reset your AgileMentor password", html)).start()

    return {"success": True, "message": "If that email is registered, you'll receive a reset link shortly."}

@app.post("/api/auth/reset-password")
def reset_password(body: ResetPasswordBody, db: Session = Depends(get_db)):
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == body.token,
        PasswordResetToken.is_used == False
    ).first()

    if not reset or reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token is invalid or expired")
    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if not validate_password(body.password):
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters and start with a capital letter")

    user = db.query(User).filter(User.user_id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(body.password)
    reset.is_used = True
    db.commit()
    return {"success": True, "role": user.role}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/dashboard")
def admin_dashboard(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    return {
        "total_programs":       db.query(Program).count(),
        "active_programs":      db.query(Program).filter(Program.status == "active").count(),
        "total_sessions":       db.query(MentorSession).count(),
        "live_sessions":        db.query(MentorSession).filter(MentorSession.status == "live").count(),
        "total_users":          db.query(User).filter(User.role != "admin").count(),
        "total_mentors":        db.query(User).filter(User.role == "mentor").count(),
        "total_enrollments":    db.query(Enrollment).count(),
        "certificate_eligible": db.query(Enrollment).filter(Enrollment.status == "certificate_eligible").count(),
    }

@app.post("/api/admin/generate-invite")
def generate_invite(body: GenerateInviteBody, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    invite_code = secrets.token_hex(6).upper()
    invite = MentorInvite(
        invite_id=generate_invite_id(db), invite_code=invite_code,
        created_by=current_user.user_id, is_used=False
    )
    db.add(invite)
    db.commit()

    html = f"""<p>Hello,</p><p>You have been invited to join <strong>AgileMentor</strong> as a mentor.</p>
<p>Use code: <h2>{invite_code}</h2> at <a href="{FRONTEND_URL}/signup/mentor">{FRONTEND_URL}/signup/mentor</a></p>
<p>This is a one-time code. Welcome aboard!<br>— The AgileMentor Team</p>"""
    threading.Thread(target=send_email, args=(body.mentor_email, "You've been invited to AgileMentor as a Mentor", html)).start()
    return {"success": True, "invite_code": invite_code}

# ── ADMIN: Users ──────────────────────────────────────────────────────────────

@app.get("/api/admin/users")
def admin_get_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role != "admin").all()
    return [{"user_id": u.user_id, "full_name": u.full_name, "email": u.email,
             "role": u.role, "status": u.status, "created_at": str(u.created_at),
             "profile_photo": u.profile_photo} for u in users]

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not db.query(User).filter(User.user_id == user_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    mentor = db.query(Mentor).filter(Mentor.user_id == user_id).first()
    if mentor:
        mentor_sessions = db.query(MentorSession).filter(MentorSession.mentor_id == mentor.mentor_profile_id).all()
        for s in mentor_sessions:
            db.query(Attendance).filter(Attendance.session_id == s.session_id).delete()
            db.query(VideoProgress).filter(VideoProgress.session_id == s.session_id).delete()
            db.query(SessionCompletion).filter(SessionCompletion.session_id == s.session_id).delete()
            db.query(Feedback).filter(Feedback.session_id == s.session_id).update({"session_id": None}, synchronize_session=False)
            db.query(Resource).filter(Resource.session_id == s.session_id).delete()
        db.query(MentorSession).filter(MentorSession.mentor_id == mentor.mentor_profile_id).delete()
        db.query(Program).filter(Program.assigned_mentor == mentor.mentor_profile_id).update({"assigned_mentor": None}, synchronize_session=False)
        db.query(MentorCertificate).filter(MentorCertificate.mentor_profile_id == mentor.mentor_profile_id).delete()
        db.delete(mentor)

    db.query(Attendance).filter(Attendance.user_id == user_id).delete()
    db.query(VideoProgress).filter(VideoProgress.user_id == user_id).delete()
    db.query(SessionCompletion).filter(SessionCompletion.user_id == user_id).delete()
    db.query(Feedback).filter(Feedback.mentee_user_id == user_id).update({"mentee_user_id": None}, synchronize_session=False)
    db.query(Enrollment).filter(Enrollment.user_id == user_id).delete()
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete()
    db.query(EmailOTP).filter(EmailOTP.user_id == user_id).delete()
    db.query(Notification).filter(Notification.user_id == user_id).delete()
    db.query(Resource).filter(Resource.uploaded_by == user_id).delete()

    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        db.delete(user)
    db.commit()
    return {"success": True}

# ── Upload helpers ────────────────────────────────────────────────────────────

MAX_UPLOAD_BYTES       = 10  * 1024 * 1024  # 10 MB  (images, docs, certs)
MAX_VIDEO_UPLOAD_BYTES = 300 * 1024 * 1024  # 300 MB (video resources)

ALLOWED_IMAGE_TYPES  = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES    = ALLOWED_IMAGE_TYPES | {"application/pdf"}
ALLOWED_VIDEO_TYPES  = {"video/mp4", "video/webm", "video/ogg", "video/quicktime"}
ALLOWED_RESOURCE_TYPES = ALLOWED_DOC_TYPES | ALLOWED_VIDEO_TYPES | {
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

def _validate_upload(file: UploadFile, contents: bytes, allowed_types: set, max_bytes: int = MAX_UPLOAD_BYTES):
    if len(contents) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {limit_mb} MB.")
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

# ── ADMIN: Programs ───────────────────────────────────────────────────────────

@app.post("/api/upload-cover")
async def upload_cover_image(file: UploadFile = File(...), current_user: User = Depends(require_user)):
    contents = await file.read()
    _validate_upload(file, contents, ALLOWED_IMAGE_TYPES)
    try:
        url = upload_file(contents, folder="agilementor/covers", resource_type="image")
    except Exception:
        raise HTTPException(status_code=503, detail="Image upload failed. Please try again.")
    return {"url": url}

@app.get("/api/admin/programs")
def admin_get_programs(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    programs = db.query(Program).all()
    mentors = {m.mentor_profile_id: u.full_name
               for m, u in db.query(Mentor, User).join(User, Mentor.user_id == User.user_id).all()}
    return [{"program_id": p.program_id, "title": p.title, "description": p.description,
             "category": p.category, "duration_weeks": p.duration_weeks,
             "start_date": str(p.start_date) if p.start_date else None,
             "end_date": str(p.end_date) if p.end_date else None,
             "status": p.status, "assigned_mentor": p.assigned_mentor,
             "mentor_name": mentors.get(p.assigned_mentor),
             "cover_image": p.cover_image} for p in programs]

@app.post("/api/admin/programs")
def admin_create_program(body: CreateProgramBody, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not body.title or not body.title[0].isupper():
        raise HTTPException(status_code=400, detail="Program title must start with a capital letter")
    program = Program(
        program_id=generate_program_id(db), title=body.title, description=body.description,
        category=body.category, duration_weeks=body.duration_weeks,
        start_date=body.start_date, end_date=body.end_date,
        created_by=current_user.user_id,
        assigned_mentor=body.assigned_mentor or None, status="active",
        cover_image=body.cover_image
    )
    db.add(program)
    db.commit()
    return {"success": True, "program_id": program.program_id}

@app.put("/api/admin/programs/{program_id}")
def admin_update_program(program_id: str, body: UpdateProgramBody, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    program = db.query(Program).filter(Program.program_id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    if body.title: program.title = body.title
    if body.description: program.description = body.description
    if body.category: program.category = body.category
    if body.duration_weeks: program.duration_weeks = body.duration_weeks
    if body.start_date: program.start_date = body.start_date
    if body.end_date: program.end_date = body.end_date
    if body.assigned_mentor: program.assigned_mentor = body.assigned_mentor
    if body.status: program.status = body.status
    if body.cover_image is not None: program.cover_image = body.cover_image or None
    db.commit()
    return {"success": True}

@app.delete("/api/admin/programs/{program_id}")
def admin_delete_program(program_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    program_sessions = db.query(MentorSession).filter(MentorSession.program_id == program_id).all()
    for s in program_sessions:
        db.query(Attendance).filter(Attendance.session_id == s.session_id).delete()
        db.query(VideoProgress).filter(VideoProgress.session_id == s.session_id).delete()
        db.query(SessionCompletion).filter(SessionCompletion.session_id == s.session_id).delete()
        db.query(Feedback).filter(Feedback.session_id == s.session_id).update({"session_id": None}, synchronize_session=False)
        db.query(Resource).filter(Resource.session_id == s.session_id).delete()
    db.query(MentorSession).filter(MentorSession.program_id == program_id).delete()
    db.query(Enrollment).filter(Enrollment.program_id == program_id).delete()
    db.query(SessionCompletion).filter(SessionCompletion.program_id == program_id).delete()
    db.query(Resource).filter(Resource.program_id == program_id).delete()
    program = db.query(Program).filter(Program.program_id == program_id).first()
    if program:
        db.delete(program)
    db.commit()
    return {"success": True}

@app.get("/api/admin/mentors")
def admin_get_mentors(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Mentor, User).join(User, Mentor.user_id == User.user_id).all()
    return [{"mentor_profile_id": m.mentor_profile_id, "user_id": u.user_id,
             "full_name": u.full_name, "email": u.email} for m, u in rows]

# ── ADMIN: Sessions ───────────────────────────────────────────────────────────

@app.get("/api/admin/sessions")
def admin_get_sessions(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    sessions = db.query(MentorSession).all()
    return [{"session_id": s.session_id, "title": s.title, "description": s.description,
             "program_id": s.program_id, "mentor_id": s.mentor_id,
             "session_type": s.session_type,
             "scheduled_at": str(s.scheduled_at) if s.scheduled_at else None,
             "meeting_link": s.meeting_link, "video_url": s.video_url,
             "duration_minutes": s.duration_minutes, "status": s.status,
             "cover_image": s.cover_image,
             "created_at": str(s.created_at)} for s in sessions]

@app.post("/api/admin/sessions")
def admin_create_session(body: CreateSessionBody, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    session_id = generate_session_id(db)
    scheduled_at = None
    if body.scheduled_at:
        try:
            scheduled_at = datetime.fromisoformat(body.scheduled_at)
        except ValueError:
            scheduled_at = None
    session = MentorSession(
        session_id=session_id, program_id=body.program_id, mentor_id=body.mentor_id,
        title=body.title, description=body.description, session_type=body.session_type,
        scheduled_at=scheduled_at, meeting_link=body.meeting_link,
        video_url=body.video_url, duration_minutes=body.duration_minutes, status="scheduled",
        cover_image=body.cover_image
    )
    db.add(session)
    db.commit()

    enrollments = db.query(Enrollment).filter(Enrollment.program_id == body.program_id).all()
    program = db.query(Program).filter(Program.program_id == body.program_id).first()
    program_title = program.title if program else body.program_id
    enrolled_ids = [e.user_id for e in enrollments]
    mentees_batch = db.query(User).filter(User.user_id.in_(enrolled_ids)).all() if enrolled_ids else []

    mentee_list = []
    for mentee in mentees_batch:
        mentee_list.append((mentee.full_name, mentee.email))
        html = session_created_email(
            full_name=mentee.full_name, session_title=body.title,
            session_type=body.session_type, program_title=program_title,
            scheduled_at=body.scheduled_at, meeting_link=body.meeting_link, video_url=body.video_url
        )
        threading.Thread(target=send_email, args=(mentee.email, f"New Session Added: {body.title}", html)).start()
        _notify(mentee.user_id, f"New Session: {body.title}", f"A new session was added to {program_title}.", "new_session", "/mentee/sessions", db)

    if body.session_type == "live" and body.scheduled_at and body.meeting_link and mentee_list:
        try:
            scheduled_dt = datetime.fromisoformat(body.scheduled_at)
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            schedule_session_reminder(
                session_id=session_id, session_title=body.title, program_title=program_title,
                scheduled_at_dt=scheduled_dt, meeting_link=body.meeting_link,
                mentee_list=mentee_list, minutes_before=30
            )
        except Exception as e:
            print(f"[REMINDER] {e}")

    return {"success": True, "session_id": session_id}

@app.put("/api/admin/sessions/{session_id}")
def admin_update_session(session_id: str, body: UpdateSessionBody, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    session = db.query(MentorSession).filter(MentorSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if body.title: session.title = body.title
    if body.description: session.description = body.description
    if body.scheduled_at:
        try:
            session.scheduled_at = datetime.fromisoformat(body.scheduled_at)
        except ValueError:
            pass
    if body.meeting_link: session.meeting_link = body.meeting_link
    if body.video_url: session.video_url = body.video_url
    if body.duration_minutes: session.duration_minutes = body.duration_minutes
    if body.status: session.status = body.status
    if body.cover_image is not None: session.cover_image = body.cover_image or None
    db.commit()
    return {"success": True}

@app.delete("/api/admin/sessions/{session_id}")
def admin_delete_session(session_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    db.query(Attendance).filter(Attendance.session_id == session_id).delete()
    db.query(VideoProgress).filter(VideoProgress.session_id == session_id).delete()
    db.query(SessionCompletion).filter(SessionCompletion.session_id == session_id).delete()
    db.query(Feedback).filter(Feedback.session_id == session_id).update({"session_id": None}, synchronize_session=False)
    db.query(Resource).filter(Resource.session_id == session_id).delete()
    session = db.query(MentorSession).filter(MentorSession.session_id == session_id).first()
    if session:
        db.delete(session)
    db.commit()
    return {"success": True}

# ── ADMIN: Attendance ─────────────────────────────────────────────────────────

@app.get("/api/admin/attendance/{session_id}")
def admin_get_attendance(session_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    session = db.query(MentorSession).filter(MentorSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    enrollments = db.query(Enrollment).filter(Enrollment.program_id == session.program_id).all()
    enrolled_ids = [e.user_id for e in enrollments]
    users_map = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(enrolled_ids)).all()}
    att_map = {a.user_id: a for a in db.query(Attendance).filter(
        Attendance.session_id == session_id, Attendance.user_id.in_(enrolled_ids)).all()}
    return {
        "session": {"session_id": session.session_id, "title": session.title,
                    "session_type": session.session_type, "duration_minutes": session.duration_minutes},
        "mentees": [{"user_id": uid, "full_name": users_map[uid].full_name if uid in users_map else uid,
                     "status": att_map[uid].status if uid in att_map else None,
                     "marked_at": str(att_map[uid].marked_at) if uid in att_map and att_map[uid].marked_at else None}
                    for uid in enrolled_ids]
    }

@app.post("/api/admin/attendance/{session_id}/mark")
def admin_mark_attendance(session_id: str, body: MarkAttendanceBody,
                          current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    session = db.query(MentorSession).filter(MentorSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    existing = db.query(Attendance).filter(
        Attendance.session_id == session_id, Attendance.user_id == body.user_id).first()
    if existing:
        existing.status = body.status
    else:
        db.add(Attendance(
            attendance_id=generate_attendance_id(db),
            session_id=session_id, user_id=body.user_id, status=body.status
        ))
    db.commit()
    if body.status == "present":
        _sync_attendance_completion(session_id, body.user_id, session.program_id, db)
    return {"success": True}

# ── ADMIN: Resources ──────────────────────────────────────────────────────────

@app.get("/api/admin/resources")
def admin_get_resources(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    resources = db.query(Resource).order_by(Resource.uploaded_at.desc()).all()
    return [{"resource_id": r.resource_id, "title": r.title, "description": r.description,
             "file_url": r.file_url, "file_type": r.file_type, "scope": r.scope,
             "program_id": r.program_id, "session_id": r.session_id,
             "uploaded_at": str(r.uploaded_at)} for r in resources]

@app.post("/api/admin/resources")
async def admin_upload_resource(
    title: str = Form(...), description: str = Form(""),
    program_id: str = Form(""), session_id: str = Form(""),
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    contents = await file.read()
    _validate_upload(file, contents, ALLOWED_RESOURCE_TYPES, max_bytes=MAX_VIDEO_UPLOAD_BYTES)
    file_type = detect_file_type(file.filename)
    cld_type = "video" if file.content_type in ALLOWED_VIDEO_TYPES else ("image" if file_type == "image" else "raw")
    try:
        url = upload_file(contents, folder="agilementor/resources", resource_type=cld_type)
    except Exception:
        raise HTTPException(status_code=503, detail="File upload failed. Please try again.")
    resource = Resource(
        resource_id=generate_resource_id(db), title=title, description=description or None,
        file_url=url, file_type=file_type, scope="program" if program_id else "global",
        program_id=program_id or None, session_id=session_id or None,
        uploaded_by=current_user.user_id,
    )
    db.add(resource)
    db.commit()
    return {"success": True, "resource_id": resource.resource_id}

@app.delete("/api/admin/resources/{resource_id}")
def admin_delete_resource(resource_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    r = db.query(Resource).filter(Resource.resource_id == resource_id).first()
    if r:
        db.delete(r)
        db.commit()
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# MENTOR ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/mentor/dashboard")
def mentor_dashboard(current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        return {"stats": {}, "sessions": [], "pending_programs": []}

    sessions = db.query(MentorSession).filter(
        MentorSession.mentor_id == mentor.mentor_profile_id
    ).order_by(MentorSession.created_at.desc()).limit(4).all()

    programs = db.query(Program).filter(Program.assigned_mentor == mentor.mentor_profile_id).all()
    program_ids = [p.program_id for p in programs]
    total_mentees = db.query(Enrollment).filter(Enrollment.program_id.in_(program_ids)).count() if program_ids else 0

    pending_programs = [p for p in programs if p.status == "pending"]

    return {
        "stats": {
            "total_sessions": db.query(MentorSession).filter(MentorSession.mentor_id == mentor.mentor_profile_id).count(),
            "live_sessions": db.query(MentorSession).filter(
                MentorSession.mentor_id == mentor.mentor_profile_id,
                MentorSession.session_type == "live").count(),
            "total_mentees": total_mentees,
            "total_certs": db.query(MentorCertificate).filter(
                MentorCertificate.mentor_profile_id == mentor.mentor_profile_id).count(),
        },
        "sessions": [{"session_id": s.session_id, "title": s.title, "session_type": s.session_type,
                      "status": s.status, "scheduled_at": str(s.scheduled_at) if s.scheduled_at else None}
                     for s in sessions],
        "pending_programs": [{"program_id": p.program_id, "title": p.title} for p in pending_programs],
    }

@app.get("/api/mentor/profile")
def mentor_profile(current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    return {
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "profile_photo": current_user.profile_photo,
        "mentor_profile_id": mentor.mentor_profile_id if mentor else None,
        "expertise": mentor.expertise if mentor else None,
        "experience_years": mentor.experience_years if mentor else None,
        "bio": mentor.bio if mentor else None,
        "linkedin_url": mentor.linkedin_url if mentor else None,
    }

@app.put("/api/mentor/profile")
def update_mentor_profile(body: UpdateMentorProfileBody, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found")
    if body.expertise: mentor.expertise = body.expertise
    if body.experience_years: mentor.experience_years = body.experience_years
    if body.bio: mentor.bio = body.bio
    if body.linkedin_url: mentor.linkedin_url = body.linkedin_url
    db.commit()
    return {"success": True}

@app.post("/api/mentor/profile/photo")
async def upload_profile_photo(file: UploadFile = File(...),
                                current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    contents = await file.read()
    _validate_upload(file, contents, ALLOWED_IMAGE_TYPES)
    try:
        url = upload_file(contents, folder="agilementor/profiles", resource_type="image")
    except Exception:
        raise HTTPException(status_code=503, detail="Image upload failed. Please try again.")
    current_user.profile_photo = url
    db.commit()
    return {"success": True, "url": url}

@app.get("/api/mentor/sessions")
def mentor_get_sessions(current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        return []
    sessions = db.query(MentorSession).filter(MentorSession.mentor_id == mentor.mentor_profile_id).all()
    programs = {p.program_id: p.title for p in db.query(Program).filter(
        Program.assigned_mentor == mentor.mentor_profile_id).all()}
    session_ids = [s.session_id for s in sessions]
    all_fb = db.query(Feedback).filter(Feedback.session_id.in_(session_ids)).all() if session_ids else []
    fb_map = {}
    for f in all_fb:
        fb_map.setdefault(f.session_id, []).append(f.rating)
    def avg_r(sid):
        ratings = fb_map.get(sid, [])
        return round(sum(ratings) / len(ratings), 1) if ratings else None
    return [{"session_id": s.session_id, "title": s.title, "description": s.description,
             "program_id": s.program_id, "program_title": programs.get(s.program_id),
             "session_type": s.session_type,
             "scheduled_at": str(s.scheduled_at) if s.scheduled_at else None,
             "meeting_link": s.meeting_link, "video_url": s.video_url,
             "duration_minutes": s.duration_minutes, "status": s.status,
             "cover_image": s.cover_image,
             "avg_rating": avg_r(s.session_id), "rating_count": len(fb_map.get(s.session_id, []))} for s in sessions]

@app.get("/api/mentor/programs")
def mentor_get_programs(current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        return []
    programs = db.query(Program).filter(Program.assigned_mentor == mentor.mentor_profile_id).all()
    return [{"program_id": p.program_id, "title": p.title, "status": p.status,
             "category": p.category, "duration_weeks": p.duration_weeks} for p in programs]

@app.post("/api/mentor/sessions")
def mentor_create_session(body: CreateSessionBody, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found")
    program = db.query(Program).filter(
        Program.program_id == body.program_id,
        Program.assigned_mentor == mentor.mentor_profile_id
    ).first()
    if not program:
        raise HTTPException(status_code=403, detail="Not your program")

    session_id = generate_session_id(db)
    scheduled_at = None
    if body.scheduled_at:
        try:
            scheduled_at = datetime.fromisoformat(body.scheduled_at)
        except ValueError:
            scheduled_at = None
    session = MentorSession(
        session_id=session_id, program_id=body.program_id,
        mentor_id=mentor.mentor_profile_id, title=body.title, description=body.description,
        session_type=body.session_type, scheduled_at=scheduled_at,
        meeting_link=body.meeting_link, video_url=body.video_url,
        duration_minutes=body.duration_minutes, status="scheduled",
        cover_image=body.cover_image
    )
    db.add(session)
    db.commit()

    enrollments = db.query(Enrollment).filter(Enrollment.program_id == body.program_id).all()
    enrolled_ids = [e.user_id for e in enrollments]
    mentees_batch = db.query(User).filter(User.user_id.in_(enrolled_ids)).all() if enrolled_ids else []
    mentee_list = []
    for mentee in mentees_batch:
        mentee_list.append((mentee.full_name, mentee.email))
        html = session_created_email(
            full_name=mentee.full_name, session_title=body.title,
            session_type=body.session_type, program_title=program.title,
            scheduled_at=body.scheduled_at, meeting_link=body.meeting_link, video_url=body.video_url
        )
        threading.Thread(target=send_email, args=(mentee.email, f"New Session Added: {body.title}", html)).start()
        _notify(mentee.user_id, f"New Session: {body.title}", f"A new session was added to {program.title}.", "new_session", "/mentee/sessions", db)

    if body.session_type == "live" and body.scheduled_at and body.meeting_link and mentee_list:
        try:
            scheduled_dt = datetime.fromisoformat(body.scheduled_at)
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            schedule_session_reminder(
                session_id=session_id, session_title=body.title, program_title=program.title,
                scheduled_at_dt=scheduled_dt, meeting_link=body.meeting_link,
                mentee_list=mentee_list, minutes_before=30
            )
        except Exception as e:
            print(f"[REMINDER] {e}")

    return {"success": True, "session_id": session_id}

@app.put("/api/mentor/sessions/{session_id}")
def mentor_update_session(session_id: str, body: UpdateSessionBody,
                           current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found")
    session = db.query(MentorSession).filter(
        MentorSession.session_id == session_id,
        MentorSession.mentor_id == mentor.mentor_profile_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if body.title: session.title = body.title
    if body.description: session.description = body.description
    if body.scheduled_at:
        try:
            session.scheduled_at = datetime.fromisoformat(body.scheduled_at)
        except ValueError:
            pass
    if body.meeting_link: session.meeting_link = body.meeting_link
    if body.video_url: session.video_url = body.video_url
    if body.duration_minutes: session.duration_minutes = body.duration_minutes
    if body.status: session.status = body.status
    if body.cover_image is not None: session.cover_image = body.cover_image or None
    db.commit()
    return {"success": True}

@app.delete("/api/mentor/sessions/{session_id}")
def mentor_delete_session(session_id: str, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found")
    session = db.query(MentorSession).filter(
        MentorSession.session_id == session_id,
        MentorSession.mentor_id == mentor.mentor_profile_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.query(Attendance).filter(Attendance.session_id == session_id).delete()
    db.query(VideoProgress).filter(VideoProgress.session_id == session_id).delete()
    db.query(SessionCompletion).filter(SessionCompletion.session_id == session_id).delete()
    db.query(Feedback).filter(Feedback.session_id == session_id).update({"session_id": None}, synchronize_session=False)
    db.query(Resource).filter(Resource.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return {"success": True}

@app.get("/api/mentor/certificates")
def mentor_get_certificates(current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        return []
    certs = db.query(MentorCertificate).filter(MentorCertificate.mentor_profile_id == mentor.mentor_profile_id).all()
    return [{"cert_id": c.cert_id, "title": c.title, "file_url": c.file_url,
             "file_type": c.file_type, "uploaded_at": str(c.uploaded_at) if hasattr(c, 'uploaded_at') else None}
            for c in certs]

@app.post("/api/mentor/certificates")
async def mentor_upload_certificate(
    title: str = Form(...), file: UploadFile = File(...),
    current_user: User = Depends(require_mentor), db: Session = Depends(get_db)
):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found")
    contents = await file.read()
    _validate_upload(file, contents, ALLOWED_DOC_TYPES)
    file_type = "pdf" if file.filename.lower().endswith(".pdf") else "image"
    resource_type = "raw" if file_type == "pdf" else "image"
    try:
        url = upload_file(contents, folder="agilementor/certificates", resource_type=resource_type)
    except Exception:
        raise HTTPException(status_code=503, detail="File upload failed. Please try again.")
    cert = MentorCertificate(
        cert_id=generate_cert_id(db), mentor_profile_id=mentor.mentor_profile_id,
        title=title, file_url=url, file_type=file_type
    )
    db.add(cert)
    db.commit()
    return {"success": True, "cert_id": cert.cert_id, "file_url": url}

@app.delete("/api/mentor/certificates/{cert_id}")
def mentor_delete_certificate(cert_id: str, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    cert = db.query(MentorCertificate).filter(MentorCertificate.cert_id == cert_id).first()
    if cert:
        db.delete(cert)
        db.commit()
    return {"success": True}

@app.get("/api/mentor/resources")
def mentor_get_resources(current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    own = db.query(Resource).filter(Resource.uploaded_by == current_user.user_id).all()
    global_res = db.query(Resource).filter(Resource.scope == "global", Resource.uploaded_by != current_user.user_id).all()
    prog_ids = [p.program_id for p in db.query(Program).filter(Program.assigned_mentor == mentor.mentor_profile_id).all()] if mentor else []
    prog_res = db.query(Resource).filter(Resource.scope == "program", Resource.program_id.in_(prog_ids),
                                          Resource.uploaded_by != current_user.user_id).all() if prog_ids else []
    resources = own + global_res + prog_res
    return [{"resource_id": r.resource_id, "title": r.title, "description": r.description,
             "file_url": r.file_url, "file_type": r.file_type, "scope": r.scope,
             "program_id": r.program_id} for r in resources]

@app.post("/api/mentor/resources")
async def mentor_upload_resource(
    title: str = Form(...), description: str = Form(""),
    program_id: str = Form(""), session_id: str = Form(""),
    file: UploadFile = File(...),
    current_user: User = Depends(require_mentor), db: Session = Depends(get_db)
):
    if program_id:
        mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
        prog = db.query(Program).filter(
            Program.program_id == program_id,
            Program.assigned_mentor == mentor.mentor_profile_id
        ).first() if mentor else None
        if not prog:
            raise HTTPException(status_code=403, detail="Not your program")
    contents = await file.read()
    _validate_upload(file, contents, ALLOWED_RESOURCE_TYPES, max_bytes=MAX_VIDEO_UPLOAD_BYTES)
    file_type = detect_file_type(file.filename)
    cld_type = "video" if file.content_type in ALLOWED_VIDEO_TYPES else ("image" if file_type == "image" else "raw")
    try:
        url = upload_file(contents, folder="agilementor/resources", resource_type=cld_type)
    except Exception:
        raise HTTPException(status_code=503, detail="File upload failed. Please try again.")
    resource = Resource(
        resource_id=generate_resource_id(db), title=title, description=description or None,
        file_url=url, file_type=file_type, scope="program" if program_id else "global",
        program_id=program_id or None, session_id=session_id or None,
        uploaded_by=current_user.user_id,
    )
    db.add(resource)
    db.commit()
    return {"success": True, "resource_id": resource.resource_id}

@app.delete("/api/mentor/resources/{resource_id}")
def mentor_delete_resource(resource_id: str, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    r = db.query(Resource).filter(
        Resource.resource_id == resource_id,
        Resource.uploaded_by == current_user.user_id
    ).first()
    if r:
        db.delete(r)
        db.commit()
    return {"success": True}

@app.post("/api/mentor/programs/{program_id}/approve")
def mentor_approve_program(program_id: str, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    program = db.query(Program).filter(
        Program.program_id == program_id,
        Program.assigned_mentor == mentor.mentor_profile_id,
        Program.status == "pending"
    ).first() if mentor else None
    if program:
        program.status = "active"
        db.commit()
    return {"success": True}

@app.post("/api/mentor/programs/{program_id}/reject")
def mentor_reject_program(program_id: str, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    program = db.query(Program).filter(
        Program.program_id == program_id,
        Program.assigned_mentor == mentor.mentor_profile_id,
        Program.status == "pending"
    ).first() if mentor else None
    if program:
        program.status = "rejected"
        db.commit()
    return {"success": True}

@app.get("/api/mentor/attendance/{session_id}")
def mentor_get_attendance(session_id: str, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    session = db.query(MentorSession).filter(
        MentorSession.session_id == session_id,
        MentorSession.mentor_id == mentor.mentor_profile_id
    ).first() if mentor else None
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    enrollments = db.query(Enrollment).filter(Enrollment.program_id == session.program_id).all()
    enrolled_ids = [e.user_id for e in enrollments]
    users_map = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(enrolled_ids)).all()}
    att_map = {a.user_id: a for a in db.query(Attendance).filter(
        Attendance.session_id == session_id, Attendance.user_id.in_(enrolled_ids)).all()}
    return {
        "session": {"session_id": session.session_id, "title": session.title},
        "mentees": [{"user_id": uid, "full_name": users_map[uid].full_name if uid in users_map else uid,
                     "status": att_map[uid].status if uid in att_map else None}
                    for uid in enrolled_ids]
    }

@app.post("/api/mentor/attendance/{session_id}/mark")
def mentor_mark_attendance(session_id: str, body: MarkAttendanceBody,
                            current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    session = db.query(MentorSession).filter(MentorSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    existing = db.query(Attendance).filter(
        Attendance.session_id == session_id, Attendance.user_id == body.user_id).first()
    if existing:
        existing.status = body.status
    else:
        db.add(Attendance(
            attendance_id=generate_attendance_id(db),
            session_id=session_id, user_id=body.user_id, status=body.status
        ))
    db.commit()
    if body.status == "present":
        _sync_attendance_completion(session_id, body.user_id, session.program_id, db)
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# MENTEE ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/mentee/dashboard")
def mentee_dashboard(current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current_user.user_id).all()
    program_ids = [e.program_id for e in enrollments]
    programs_map = {
        p.program_id: p for p in db.query(Program).filter(Program.program_id.in_(program_ids)).all()
    } if program_ids else {}

    upcoming = db.query(MentorSession).filter(
        MentorSession.program_id.in_(program_ids), MentorSession.status == "scheduled"
    ).order_by(MentorSession.scheduled_at).limit(4).all() if program_ids else []

    att_records = db.query(Attendance).filter(
        Attendance.user_id == current_user.user_id
    ).order_by(Attendance.marked_at.desc()).limit(4).all()
    att_sids = [a.session_id for a in att_records]
    att_sessions_map = {
        s.session_id: s for s in db.query(MentorSession).filter(MentorSession.session_id.in_(att_sids)).all()
    } if att_sids else {}

    return {
        "stats": {
            "total_enrollments": len(enrollments),
            "active_enrollments": sum(1 for e in enrollments if e.status == "active"),
            "sessions_attended": db.query(Attendance).filter(
                Attendance.user_id == current_user.user_id, Attendance.status == "present").count(),
            "upcoming_sessions": len(upcoming),
            "certificate_eligible": sum(1 for e in enrollments if e.status == "certificate_eligible"),
        },
        "enrollments": [
            {"program_id": e.program_id,
             "program_title": programs_map[e.program_id].title if e.program_id in programs_map else e.program_id,
             "status": e.status, "enrollment_date": str(e.enrollment_date)}
            for e in enrollments
        ],
        "upcoming_sessions": [
            {"session_id": s.session_id, "title": s.title, "session_type": s.session_type,
             "scheduled_at": str(s.scheduled_at) if s.scheduled_at else None, "meeting_link": s.meeting_link}
            for s in upcoming
        ],
        "recent_attendance": [
            {"session_title": att_sessions_map[a.session_id].title if a.session_id in att_sessions_map else a.session_id,
             "status": a.status, "marked_at": str(a.marked_at)}
            for a in att_records
        ],
    }

@app.get("/api/programs")
def get_programs(current_user: User = Depends(require_user), db: Session = Depends(get_db)):
    programs = db.query(Program).filter(Program.status == "active").all()
    mentors = {m.mentor_profile_id: u.full_name
               for m, u in db.query(Mentor, User).join(User, Mentor.user_id == User.user_id).all()}
    return [{"program_id": p.program_id, "title": p.title, "description": p.description,
             "category": p.category, "duration_weeks": p.duration_weeks,
             "mentor_name": mentors.get(p.assigned_mentor),
             "start_date": str(p.start_date) if p.start_date else None,
             "end_date": str(p.end_date) if p.end_date else None,
             "cover_image": p.cover_image} for p in programs]

# Alias used by mentee Browse Programs page
@app.get("/api/mentee/programs/browse")
def mentee_browse_programs(current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    programs = db.query(Program).filter(Program.status == "active").all()
    mentors = {m.mentor_profile_id: u.full_name
               for m, u in db.query(Mentor, User).join(User, Mentor.user_id == User.user_id).all()}
    return [{"program_id": p.program_id, "title": p.title, "description": p.description,
             "category": p.category, "duration_weeks": p.duration_weeks,
             "mentor_name": mentors.get(p.assigned_mentor),
             "start_date": str(p.start_date) if p.start_date else None,
             "end_date": str(p.end_date) if p.end_date else None,
             "cover_image": p.cover_image} for p in programs]

class EnrollBody(BaseModel):
    program_id: str

@app.post("/api/enroll/{program_id}")
def enroll(program_id: str, current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    return _do_enroll(program_id, current_user, db)

# Alias used by mentee frontend
@app.post("/api/mentee/enrollments")
def mentee_enroll(body: EnrollBody, current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    return _do_enroll(body.program_id, current_user, db)

def _do_enroll(program_id: str, current_user: User, db: Session):
    program = db.query(Program).filter(Program.program_id == program_id, Program.status == "active").first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found or not active")
    existing = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.user_id, Enrollment.program_id == program_id
    ).first()
    if existing and existing.status in ("enrolled", "active", "pending", "certificate_eligible", "completed"):
        raise HTTPException(status_code=400, detail="Already enrolled or request pending")
    enrollment = Enrollment(
        enrollment_id=generate_enrollment_id(db, program.title),
        user_id=current_user.user_id, program_id=program_id, status="pending"
    )
    db.add(enrollment)
    db.commit()
    # Notify all admins
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        html = enrollment_request_admin_email(
            admin_name=admin.full_name, mentee_name=current_user.full_name,
            mentee_email=current_user.email, program_title=program.title
        )
        threading.Thread(target=send_email, args=(admin.email, f"New Enrollment Request: {program.title}", html)).start()
    return {"success": True, "enrollment_id": enrollment.enrollment_id, "status": "pending"}

@app.delete("/api/mentee/enrollments/{enrollment_id}")
def mentee_unenroll(enrollment_id: str, current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(
        Enrollment.enrollment_id == enrollment_id,
        Enrollment.user_id == current_user.user_id,
        Enrollment.status.in_(["enrolled", "active"])
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found or cannot unenroll")
    db.delete(enrollment)
    db.commit()
    return {"success": True}

# ── ENROLLMENT APPROVAL WORKFLOW ─────────────────────────────────────────────

@app.get("/api/admin/enrollment-requests")
def admin_get_enrollment_requests(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    pending = db.query(Enrollment).filter(Enrollment.status == "pending").all()
    if not pending:
        return []
    user_ids = [e.user_id for e in pending]
    prog_ids = [e.program_id for e in pending]
    users_map = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()}
    programs_map = {p.program_id: p for p in db.query(Program).filter(Program.program_id.in_(prog_ids)).all()}
    return [
        {"enrollment_id": e.enrollment_id, "user_id": e.user_id,
         "full_name": users_map[e.user_id].full_name if e.user_id in users_map else e.user_id,
         "email": users_map[e.user_id].email if e.user_id in users_map else None,
         "program_id": e.program_id,
         "program_title": programs_map[e.program_id].title if e.program_id in programs_map else e.program_id,
         "requested_at": str(e.enrollment_date)}
        for e in pending
    ]

@app.post("/api/admin/enrollment-requests/{enrollment_id}/approve")
def admin_approve_enrollment(enrollment_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(
        Enrollment.enrollment_id == enrollment_id, Enrollment.status == "pending"
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Request not found")
    mentee = db.query(User).filter(User.user_id == enrollment.user_id).first()
    program = db.query(Program).filter(Program.program_id == enrollment.program_id).first()
    enrollment.status = "enrolled"
    db.commit()
    if mentee and program:
        html = enrollment_approved_email(mentee.full_name, program.title)
        threading.Thread(target=send_email, args=(mentee.email, f"Enrollment Approved: {program.title}", html)).start()
        _notify(mentee.user_id, "Enrollment Approved 🎉", f"Your enrollment in {program.title} has been approved!", "enrollment_approved", "/mentee/enrollments", db)
    return {"success": True}

@app.post("/api/admin/enrollment-requests/{enrollment_id}/reject")
def admin_reject_enrollment(enrollment_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(
        Enrollment.enrollment_id == enrollment_id, Enrollment.status == "pending"
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Request not found")
    mentee = db.query(User).filter(User.user_id == enrollment.user_id).first()
    program = db.query(Program).filter(Program.program_id == enrollment.program_id).first()
    db.delete(enrollment)
    db.commit()
    if mentee and program:
        html = enrollment_rejected_email(mentee.full_name, program.title)
        threading.Thread(target=send_email, args=(mentee.email, f"Enrollment Update: {program.title}", html)).start()
        _notify(mentee.user_id, "Enrollment Update", f"Your enrollment request for {program.title} was not approved.", "enrollment_rejected", "/programs", db)
    return {"success": True}

@app.post("/api/admin/enrollments/{enrollment_id}/grant-certificate")
def admin_grant_certificate(enrollment_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter(Enrollment.enrollment_id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    enrollment.status = "certificate_eligible"
    db.commit()
    cert_user = db.query(User).filter(User.user_id == enrollment.user_id).first()
    cert_prog = db.query(Program).filter(Program.program_id == enrollment.program_id).first()
    if cert_user and cert_prog:
        html = certificate_earned_email(cert_user.full_name, cert_prog.title)
        threading.Thread(target=send_email, args=(cert_user.email, f"🏆 Certificate Ready: {cert_prog.title}", html)).start()
        _notify(cert_user.user_id, "Certificate Ready 🏆", f"You've earned a certificate for {cert_prog.title}!", "cert_ready", "/mentee/enrollments", db)
    return {"success": True}

@app.get("/api/mentor/enrollment-requests")
def mentor_get_enrollment_requests(current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        return []
    prog_ids = [p.program_id for p in db.query(Program).filter(Program.assigned_mentor == mentor.mentor_profile_id).all()]
    if not prog_ids:
        return []
    pending = db.query(Enrollment).filter(
        Enrollment.program_id.in_(prog_ids), Enrollment.status == "pending"
    ).all()
    if not pending:
        return []
    user_ids = [e.user_id for e in pending]
    prog_map = {p.program_id: p.title for p in db.query(Program).filter(Program.program_id.in_(prog_ids)).all()}
    users_map = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()}
    return [
        {"enrollment_id": e.enrollment_id,
         "full_name": users_map[e.user_id].full_name if e.user_id in users_map else e.user_id,
         "email": users_map[e.user_id].email if e.user_id in users_map else None,
         "program_title": prog_map.get(e.program_id, e.program_id),
         "requested_at": str(e.enrollment_date)}
        for e in pending
    ]

@app.get("/api/mentee/enrollments")
def my_enrollments(current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current_user.user_id).all()
    program_ids = [e.program_id for e in enrollments]
    programs_map = {
        p.program_id: p for p in db.query(Program).filter(Program.program_id.in_(program_ids)).all()
    } if program_ids else {}
    mentors_map = {m.mentor_profile_id: u.full_name
                   for m, u in db.query(Mentor, User).join(User, Mentor.user_id == User.user_id).all()}
    total_sessions_by_prog = {}
    done_sessions_by_prog = {}
    if program_ids:
        for prog_id in program_ids:
            total_sessions_by_prog[prog_id] = db.query(MentorSession).filter(
                MentorSession.program_id == prog_id).count()
            done_sessions_by_prog[prog_id] = db.query(SessionCompletion).filter(
                SessionCompletion.user_id == current_user.user_id,
                SessionCompletion.program_id == prog_id,
                SessionCompletion.completed == True).count()
    return [
        {"enrollment_id": e.enrollment_id, "program_id": e.program_id,
         "program_title": programs_map[e.program_id].title if e.program_id in programs_map else e.program_id,
         "program_description": programs_map[e.program_id].description if e.program_id in programs_map else None,
         "mentor_name": mentors_map.get(programs_map[e.program_id].assigned_mentor) if e.program_id in programs_map else None,
         "status": e.status,
         "progress": round(done_sessions_by_prog.get(e.program_id, 0) / total_sessions_by_prog[e.program_id] * 100)
                     if total_sessions_by_prog.get(e.program_id) else 0,
         "certificate_issued": e.status == "certificate_eligible",
         "enrollment_date": str(e.enrollment_date)}
        for e in enrollments
    ]

@app.get("/api/mentee/sessions")
def my_sessions(current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current_user.user_id).all()
    if not enrollments:
        return []
    enrolled_prog_ids = {e.program_id for e in enrollments if e.status in ("enrolled", "active", "certificate_eligible", "completed")}
    pending_prog_ids  = {e.program_id for e in enrollments if e.status == "pending"}
    all_prog_ids = enrolled_prog_ids | pending_prog_ids
    sessions = db.query(MentorSession).filter(MentorSession.program_id.in_(all_prog_ids)).all()
    programs_map = {p.program_id: p.title for p in db.query(Program).filter(
        Program.program_id.in_(all_prog_ids)).all()}
    completions = {c.session_id for c in db.query(SessionCompletion).filter(
        SessionCompletion.user_id == current_user.user_id, SessionCompletion.completed == True).all()}
    return [
        {"session_id": s.session_id, "title": s.title, "description": s.description,
         "program_id": s.program_id, "program_title": programs_map.get(s.program_id),
         "session_type": s.session_type,
         "scheduled_at": str(s.scheduled_at) if s.scheduled_at else None,
         "meeting_link": s.meeting_link, "video_url": s.video_url,
         "duration_minutes": s.duration_minutes, "status": s.status,
         "cover_image": s.cover_image,
         "is_completed": s.session_id in completions,
         "access_locked": s.program_id in pending_prog_ids}
        for s in sessions
    ]

@app.get("/api/mentee/attendance")
def my_attendance(current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    records = db.query(Attendance).filter(Attendance.user_id == current_user.user_id).all()
    sids = [a.session_id for a in records]
    sessions_map = {
        s.session_id: s for s in db.query(MentorSession).filter(MentorSession.session_id.in_(sids)).all()
    } if sids else {}
    programs_map = {}
    if sessions_map:
        prog_ids = list({s.program_id for s in sessions_map.values()})
        programs_map = {p.program_id: p.title for p in db.query(Program).filter(
            Program.program_id.in_(prog_ids)).all()}
    return [
        {"attendance_id": a.attendance_id,
         "session_id": a.session_id,
         "session_title": sessions_map[a.session_id].title if a.session_id in sessions_map else a.session_id,
         "program_title": programs_map.get(sessions_map[a.session_id].program_id) if a.session_id in sessions_map else None,
         "session_date": str(sessions_map[a.session_id].scheduled_at) if a.session_id in sessions_map and sessions_map[a.session_id].scheduled_at else str(a.marked_at) if a.marked_at else None,
         "status": a.status, "marked_at": str(a.marked_at) if a.marked_at else None,
         "total_minutes_present": a.total_minutes_present}
        for a in records
    ]

@app.get("/api/mentee/resources")
def my_resources(current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.user_id, Enrollment.status == "active").all()
    prog_ids = [e.program_id for e in enrollments]
    global_res = db.query(Resource).filter(Resource.scope == "global").all()
    prog_res = db.query(Resource).filter(
        Resource.scope == "program", Resource.program_id.in_(prog_ids)).all() if prog_ids else []
    resources = global_res + prog_res
    return [{"resource_id": r.resource_id, "title": r.title, "description": r.description,
             "file_url": r.file_url, "file_type": r.file_type, "scope": r.scope} for r in resources]


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION JOIN / LEAVE
# ═══════════════════════════════════════════════════════════════════════════════

def _check_certificate_eligibility(user_id: str, program_id: str, db):
    """Mark enrollment certificate_eligible when all trackable sessions in the program are completed.
    Sessions with no duration_minutes set are excluded (they cannot be tracked)."""
    trackable = db.query(MentorSession).filter(
        MentorSession.program_id == program_id,
        MentorSession.duration_minutes > 0
    ).all()
    if not trackable:
        return
    completed_ids = {c.session_id for c in db.query(SessionCompletion).filter(
        SessionCompletion.user_id == user_id,
        SessionCompletion.program_id == program_id,
        SessionCompletion.completed == True
    ).all()}
    if all(s.session_id in completed_ids for s in trackable):
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == user_id,
            Enrollment.program_id == program_id,
            Enrollment.status.in_(["enrolled", "active"])
        ).first()
        if enrollment:
            enrollment.status = "certificate_eligible"
            db.commit()
            cert_user = db.query(User).filter(User.user_id == user_id).first()
            cert_prog = db.query(Program).filter(Program.program_id == program_id).first()
            if cert_user and cert_prog:
                html = certificate_earned_email(cert_user.full_name, cert_prog.title)
                threading.Thread(target=send_email, args=(cert_user.email, f"🏆 Certificate Ready: {cert_prog.title}", html)).start()
                _notify(cert_user.user_id, "Certificate Ready 🏆", f"You've earned a certificate for {cert_prog.title}!", "cert_ready", "/mentee/enrollments", db)

def _sync_attendance_completion(session_id: str, user_id: str, program_id: str, db):
    """When a mentee is marked present, ensure a SessionCompletion exists and check certificate."""
    existing = db.query(SessionCompletion).filter(
        SessionCompletion.user_id == user_id,
        SessionCompletion.session_id == session_id
    ).first()
    if not existing:
        completion = SessionCompletion(
            completion_id=generate_completion_id(db), user_id=user_id,
            session_id=session_id, program_id=program_id, completed=True
        )
        db.add(completion)
        db.commit()
    _check_certificate_eligibility(user_id, program_id, db)

@app.post("/api/session/{session_id}/join")
def join_session(session_id: str, current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    session = db.query(MentorSession).filter(MentorSession.session_id == session_id).first()
    if not session or not session.meeting_link:
        raise HTTPException(status_code=404, detail="Session not found or no meeting link")
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.user_id, Enrollment.program_id == session.program_id).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this program")

    attendance = db.query(Attendance).filter(
        Attendance.session_id == session_id, Attendance.user_id == current_user.user_id).first()
    if not attendance:
        attendance = Attendance(
            attendance_id=generate_attendance_id(db), session_id=session_id,
            user_id=current_user.user_id, status="absent",
            join_intervals="[]", total_minutes_present=0, is_auto_marked="false"
        )
        db.add(attendance)
        db.flush()

    intervals = json.loads(attendance.join_intervals or "[]")
    intervals.append({"join": datetime.now(timezone.utc).isoformat(), "leave": None})
    attendance.join_intervals = json.dumps(intervals)
    db.commit()
    return {"success": True, "meeting_link": session.meeting_link}

@app.post("/api/session/{session_id}/leave")
def leave_session(session_id: str, current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    session = db.query(MentorSession).filter(MentorSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    attendance = db.query(Attendance).filter(
        Attendance.session_id == session_id, Attendance.user_id == current_user.user_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    intervals = json.loads(attendance.join_intervals or "[]")
    leave_time = datetime.now(timezone.utc)
    for interval in reversed(intervals):
        if interval["leave"] is None:
            interval["leave"] = leave_time.isoformat()
            break

    total_seconds = 0
    for interval in intervals:
        if interval["join"] and interval["leave"]:
            try:
                diff = (datetime.fromisoformat(interval["leave"]) - datetime.fromisoformat(interval["join"])).total_seconds()
                if diff > 0:
                    total_seconds += diff
            except Exception:
                pass

    total_minutes = int(total_seconds / 60)
    duration_minutes = session.duration_minutes or 0
    if duration_minutes > 0 and total_minutes >= duration_minutes * 0.90:
        attendance.status = "present"
        attendance.is_auto_marked = "true"
    elif attendance.is_auto_marked == "false" and attendance.status != "present":
        attendance.status = "absent"

    attendance.join_intervals = json.dumps(intervals)
    attendance.total_minutes_present = total_minutes
    db.commit()

    if attendance.status == "present":
        _sync_attendance_completion(session_id, current_user.user_id, session.program_id, db)

    return {"success": True, "total_minutes": total_minutes, "status": attendance.status}


# ═══════════════════════════════════════════════════════════════════════════════
# VIDEO PROGRESS
# ═══════════════════════════════════════════════════════════════════════════════

def merge_segments(segments: list) -> int:
    if not segments:
        return 0
    segments.sort(key=lambda x: x[0])
    merged = [segments[0]]
    for start, end in segments[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return int(sum(end - start for start, end in merged))

@app.post("/api/video/progress")
def update_video_progress(payload: VideoSegmentBody, current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    session = db.query(MentorSession).filter(MentorSession.session_id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.user_id, Enrollment.program_id == session.program_id).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this program")

    progress = db.query(VideoProgress).filter(
        VideoProgress.user_id == current_user.user_id, VideoProgress.session_id == payload.session_id).first()
    if not progress:
        progress = VideoProgress(
            progress_id=generate_progress_id(db), user_id=current_user.user_id,
            session_id=payload.session_id, watched_segments="[]", total_watched=0
        )
        db.add(progress)
        db.flush()

    existing = json.loads(progress.watched_segments or "[]")
    existing.append([round(payload.start, 2), round(payload.end, 2)])
    merged_seconds = merge_segments(existing)
    progress.watched_segments = json.dumps(existing)
    progress.total_watched = merged_seconds

    # Use session duration if set; otherwise fall back to what the player reported
    duration_seconds = (session.duration_minutes or 0) * 60
    if duration_seconds == 0 and payload.video_duration_seconds > 0:
        duration_seconds = payload.video_duration_seconds
        session.duration_minutes = round(payload.video_duration_seconds / 60) or 1

    is_complete = duration_seconds > 0 and merged_seconds >= duration_seconds * 0.95
    db.commit()

    if is_complete and not db.query(SessionCompletion).filter(
        SessionCompletion.user_id == current_user.user_id,
        SessionCompletion.session_id == payload.session_id
    ).first():
        completion = SessionCompletion(
            completion_id=generate_completion_id(db), user_id=current_user.user_id,
            session_id=payload.session_id, program_id=session.program_id, completed=True
        )
        db.add(completion)
        db.commit()

        _check_certificate_eligibility(current_user.user_id, session.program_id, db)

    return {
        "total_watched": merged_seconds,
        "duration_seconds": duration_seconds,
        "percent": round((merged_seconds / duration_seconds * 100) if duration_seconds else 0, 1),
        "is_complete": is_complete,
    }

@app.get("/api/video/progress/{session_id}")
def get_video_progress(session_id: str, current_user: User = Depends(require_user), db: Session = Depends(get_db)):
    progress = db.query(VideoProgress).filter(
        VideoProgress.user_id == current_user.user_id, VideoProgress.session_id == session_id).first()
    completion = db.query(SessionCompletion).filter(
        SessionCompletion.user_id == current_user.user_id, SessionCompletion.session_id == session_id).first()
    session = db.query(MentorSession).filter(MentorSession.session_id == session_id).first()
    duration_seconds = (session.duration_minutes or 0) * 60 if session else 0
    total_watched = progress.total_watched if progress else 0
    return {
        "total_watched": total_watched,
        "duration_seconds": duration_seconds,
        "percent": round((total_watched / duration_seconds * 100) if duration_seconds else 0, 1),
        "is_complete": completion.completed if completion else False,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION RATINGS & FEEDBACK
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/mentee/sessions/{session_id}/rate")
def rate_session(session_id: str, body: FeedbackBody, current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    completion = db.query(SessionCompletion).filter(
        SessionCompletion.session_id == session_id,
        SessionCompletion.user_id == current_user.user_id
    ).first()
    if not completion:
        raise HTTPException(status_code=403, detail="Complete this session before rating it")
    existing = db.query(Feedback).filter(
        Feedback.session_id == session_id,
        Feedback.mentee_user_id == current_user.user_id
    ).first()
    if existing:
        existing.rating = body.rating
        existing.comments = body.comments
    else:
        fb = Feedback(
            feedback_id=generate_feedback_id(db),
            session_id=session_id,
            mentee_user_id=current_user.user_id,
            rating=body.rating,
            comments=body.comments,
        )
        db.add(fb)
    db.commit()
    all_fb = db.query(Feedback).filter(Feedback.session_id == session_id).all()
    avg = round(sum(f.rating for f in all_fb) / len(all_fb), 1) if all_fb else None
    return {"success": True, "avg_rating": avg, "rating_count": len(all_fb)}

@app.get("/api/mentee/sessions/ratings")
def mentee_my_ratings(current_user: User = Depends(require_mentee), db: Session = Depends(get_db)):
    ratings = db.query(Feedback).filter(Feedback.mentee_user_id == current_user.user_id).all()
    return {r.session_id: {"rating": r.rating, "comments": r.comments} for r in ratings}

@app.get("/api/mentor/sessions/{session_id}/ratings")
def mentor_session_ratings(session_id: str, current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    ratings = db.query(Feedback).filter(Feedback.session_id == session_id).all()
    if not ratings:
        return {"avg_rating": None, "count": 0, "ratings": []}
    mentee_ids = [r.mentee_user_id for r in ratings]
    users = {u.user_id: u.full_name for u in db.query(User).filter(User.user_id.in_(mentee_ids)).all()}
    avg = round(sum(r.rating for r in ratings) / len(ratings), 1)
    return {
        "avg_rating": avg,
        "count": len(ratings),
        "ratings": [
            {"mentee_name": users.get(r.mentee_user_id, "Anonymous"), "rating": r.rating, "comments": r.comments}
            for r in ratings
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/notifications")
def get_notifications(current_user: User = Depends(require_user), db: Session = Depends(get_db)):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "notification_id": n.notification_id,
            "title": n.title,
            "message": n.message,
            "notif_type": n.notif_type,
            "is_read": n.is_read,
            "created_at": str(n.created_at),
            "link": n.link,
        }
        for n in notifs
    ]

@app.post("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: User = Depends(require_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.user_id == current_user.user_id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"success": True}

@app.post("/api/notifications/read-all")
def mark_all_notifications_read(current_user: User = Depends(require_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True}


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/analytics")
def admin_analytics(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Enrollments by month (last 6 months)
    now = datetime.utcnow()
    enrollments_by_month = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            next_month = (month_start + timedelta(days=32)).replace(day=1)
        else:
            next_month = now
        count = db.query(Enrollment).filter(
            Enrollment.enrollment_date >= month_start,
            Enrollment.enrollment_date < next_month
        ).count()
        enrollments_by_month.append({
            "month": month_start.strftime("%b %Y"),
            "count": count,
        })

    # Programs analytics
    programs = db.query(Program).all()
    programs_data = []
    for p in programs:
        enrolled = db.query(Enrollment).filter(
            Enrollment.program_id == p.program_id,
            Enrollment.status.in_(["enrolled", "active", "certificate_eligible", "completed"])
        ).count()
        completed = db.query(SessionCompletion).filter(
            SessionCompletion.program_id == p.program_id,
            SessionCompletion.completed == True
        ).distinct(SessionCompletion.user_id).count()
        completion_rate = round(completed / enrolled * 100) if enrolled > 0 else 0
        programs_data.append({
            "title": p.title,
            "enrolled": enrolled,
            "completed": completed,
            "completion_rate": completion_rate,
        })

    # Mentors analytics
    mentor_rows = db.query(Mentor, User).join(User, Mentor.user_id == User.user_id).all()
    mentors_data = []
    for mentor, user in mentor_rows:
        session_count = db.query(MentorSession).filter(
            MentorSession.mentor_id == mentor.mentor_profile_id
        ).count()
        prog_ids = [p.program_id for p in db.query(Program).filter(
            Program.assigned_mentor == mentor.mentor_profile_id).all()]
        unique_mentees = db.query(Enrollment).filter(
            Enrollment.program_id.in_(prog_ids)
        ).distinct(Enrollment.user_id).count() if prog_ids else 0
        session_ids = [s.session_id for s in db.query(MentorSession).filter(
            MentorSession.mentor_id == mentor.mentor_profile_id).all()]
        all_fb = db.query(Feedback).filter(Feedback.session_id.in_(session_ids)).all() if session_ids else []
        avg_rating = round(sum(f.rating for f in all_fb) / len(all_fb), 1) if all_fb else None
        mentors_data.append({
            "name": user.full_name,
            "sessions": session_count,
            "avg_rating": avg_rating,
            "mentees": unique_mentees,
        })

    # Summary
    total_programs = db.query(Program).count()
    total_enrollments = db.query(Enrollment).count()
    total_completions = db.query(Enrollment).filter(
        Enrollment.status.in_(["certificate_eligible", "completed"])
    ).count()
    overall_completion_rate = round(total_completions / total_enrollments * 100) if total_enrollments > 0 else 0

    return {
        "enrollments_by_month": enrollments_by_month,
        "programs": programs_data,
        "mentors": mentors_data,
        "summary": {
            "total_programs": total_programs,
            "total_enrollments": total_enrollments,
            "total_completions": total_completions,
            "overall_completion_rate": overall_completion_rate,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MENTOR ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/mentor/analytics")
def mentor_analytics(current_user: User = Depends(require_mentor), db: Session = Depends(get_db)):
    mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
    if not mentor:
        return {"programs": []}

    programs = db.query(Program).filter(Program.assigned_mentor == mentor.mentor_profile_id).all()
    result = []

    for p in programs:
        enrollments = db.query(Enrollment).filter(
            Enrollment.program_id == p.program_id,
            Enrollment.status.in_(["enrolled", "active", "certificate_eligible", "completed"])
        ).all()
        enrolled_count = len(enrollments)
        completed_count = sum(
            1 for e in enrollments if e.status in ("certificate_eligible", "completed")
        )
        completion_rate = round(completed_count / enrolled_count * 100) if enrolled_count > 0 else 0

        # Average rating across all sessions in this program
        session_ids = [s.session_id for s in db.query(MentorSession).filter(
            MentorSession.program_id == p.program_id).all()]
        all_fb = db.query(Feedback).filter(Feedback.session_id.in_(session_ids)).all() if session_ids else []
        avg_rating = round(sum(f.rating for f in all_fb) / len(all_fb), 1) if all_fb else None
        total_sessions = len(session_ids)

        # Trackable sessions (with duration set)
        trackable_sessions = db.query(MentorSession).filter(
            MentorSession.program_id == p.program_id,
            MentorSession.duration_minutes > 0
        ).all()
        trackable_count = len(trackable_sessions)
        trackable_ids = [s.session_id for s in trackable_sessions]

        # Per-mentee details
        enrolled_user_ids = [e.user_id for e in enrollments]
        users_map = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(enrolled_user_ids)).all()} if enrolled_user_ids else {}

        mentees_data = []
        for e in enrollments:
            u = users_map.get(e.user_id)
            if not u:
                continue
            sessions_completed = db.query(SessionCompletion).filter(
                SessionCompletion.user_id == e.user_id,
                SessionCompletion.program_id == p.program_id,
                SessionCompletion.completed == True
            ).count()
            progress_pct = round(sessions_completed / trackable_count * 100) if trackable_count > 0 else 0

            # Attendance rate = present / trackable live sessions with attendance records
            live_session_ids = [s.session_id for s in db.query(MentorSession).filter(
                MentorSession.program_id == p.program_id,
                MentorSession.session_type == "live"
            ).all()]
            total_live = len(live_session_ids)
            present_count = db.query(Attendance).filter(
                Attendance.user_id == e.user_id,
                Attendance.session_id.in_(live_session_ids),
                Attendance.status == "present"
            ).count() if live_session_ids else 0
            attendance_rate = round(present_count / total_live * 100) if total_live > 0 else 0

            mentees_data.append({
                "user_id": e.user_id,
                "name": u.full_name,
                "sessions_completed": sessions_completed,
                "total_trackable_sessions": trackable_count,
                "progress_pct": progress_pct,
                "attendance_rate": attendance_rate,
            })

        result.append({
            "program_id": p.program_id,
            "title": p.title,
            "enrolled": enrolled_count,
            "completed": completed_count,
            "completion_rate": completion_rate,
            "avg_rating": avg_rating,
            "total_sessions": total_sessions,
            "mentees": mentees_data,
        })

    return {"programs": result}


# ═══════════════════════════════════════════════════════════════════════════════
# CSV EXPORT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/export/enrollments")
def export_enrollments(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).all()
    user_ids = list({e.user_id for e in enrollments})
    prog_ids = list({e.program_id for e in enrollments})
    users_map = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()} if user_ids else {}
    programs_map = {p.program_id: p for p in db.query(Program).filter(Program.program_id.in_(prog_ids)).all()} if prog_ids else {}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["enrollment_id", "mentee_name", "email", "program_title", "status", "enrolled_at"])
    for e in enrollments:
        u = users_map.get(e.user_id)
        p = programs_map.get(e.program_id)
        writer.writerow([
            e.enrollment_id,
            u.full_name if u else "",
            u.email if u else "",
            p.title if p else "",
            e.status,
            str(e.enrollment_date) if e.enrollment_date else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=enrollments.csv"},
    )

@app.get("/api/admin/export/attendance")
def export_attendance(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    records = db.query(Attendance).all()
    user_ids = list({a.user_id for a in records})
    session_ids = list({a.session_id for a in records})
    users_map = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()} if user_ids else {}
    sessions_map = {s.session_id: s for s in db.query(MentorSession).filter(MentorSession.session_id.in_(session_ids)).all()} if session_ids else {}
    prog_ids = list({s.program_id for s in sessions_map.values()})
    programs_map = {p.program_id: p for p in db.query(Program).filter(Program.program_id.in_(prog_ids)).all()} if prog_ids else {}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["mentee_name", "email", "session_title", "program_title", "status", "marked_at"])
    for a in records:
        u = users_map.get(a.user_id)
        s = sessions_map.get(a.session_id)
        p = programs_map.get(s.program_id) if s else None
        writer.writerow([
            u.full_name if u else "",
            u.email if u else "",
            s.title if s else "",
            p.title if p else "",
            a.status,
            str(a.marked_at) if a.marked_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"},
    )

@app.get("/api/admin/export/completions")
def export_completions(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).all()
    user_ids = list({e.user_id for e in enrollments})
    prog_ids = list({e.program_id for e in enrollments})
    users_map = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()} if user_ids else {}
    programs_map = {p.program_id: p for p in db.query(Program).filter(Program.program_id.in_(prog_ids)).all()} if prog_ids else {}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["mentee_name", "program_title", "sessions_completed", "total_sessions", "certificate_eligible"])
    for e in enrollments:
        u = users_map.get(e.user_id)
        p = programs_map.get(e.program_id)
        sessions_completed = db.query(SessionCompletion).filter(
            SessionCompletion.user_id == e.user_id,
            SessionCompletion.program_id == e.program_id,
            SessionCompletion.completed == True
        ).count()
        total_sessions = db.query(MentorSession).filter(
            MentorSession.program_id == e.program_id
        ).count()
        writer.writerow([
            u.full_name if u else "",
            p.title if p else "",
            sessions_completed,
            total_sessions,
            "Yes" if e.status in ("certificate_eligible", "completed") else "No",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=completions.csv"},
    )
