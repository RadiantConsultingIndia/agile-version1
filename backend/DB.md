# AgileMentor Portal — Database Schema
**Database:** PostgreSQL  
**Version:** 1.3  
**Last Updated:** June 2026

---

## Setup Instructions

1. Create a PostgreSQL database named `agilementor` (or any name you prefer)
2. Run the SQL blocks below **in order** (order matters due to foreign keys)
3. After all tables are created, insert the admin seed user (instructions at the bottom)

---

## Tables

### 1. User
```sql
CREATE TABLE "User" (
    user_id         VARCHAR(10)     PRIMARY KEY,         -- e.g. 26001
    full_name       VARCHAR(100)    NOT NULL,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            VARCHAR(10)     NOT NULL CHECK (role IN ('admin', 'mentor', 'mentee')),
    phone           VARCHAR(15),
    status          VARCHAR(10)     DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unverified')),
    profile_photo   VARCHAR(255),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. Mentor
```sql
CREATE TABLE "Mentor" (
    mentor_profile_id   VARCHAR(10)     PRIMARY KEY,     -- e.g. MTR0001
    user_id             VARCHAR(10)     NOT NULL REFERENCES "User"(user_id),
    expertise           VARCHAR(255),
    experience_years    INTEGER,
    bio                 TEXT,
    linkedin_url        VARCHAR(255)
);
```

---

### 3. MentorInvite
```sql
CREATE TABLE "MentorInvite" (
    invite_id       VARCHAR(10)     PRIMARY KEY,         -- e.g. INV0001
    invite_code     VARCHAR(20)     NOT NULL UNIQUE,
    created_by      VARCHAR(10)     REFERENCES "User"(user_id) ON DELETE SET NULL,
    used_by         VARCHAR(10)     REFERENCES "User"(user_id) ON DELETE SET NULL,
    is_used         BOOLEAN         DEFAULT FALSE,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP
);
```

---

### 4. MentorCertificate
```sql
CREATE TABLE "MentorCertificate" (
    cert_id             VARCHAR(10)     PRIMARY KEY,     -- e.g. CRT0001
    mentor_profile_id   VARCHAR(10)     NOT NULL REFERENCES "Mentor"(mentor_profile_id),
    title               VARCHAR(200),
    file_url            VARCHAR(255),
    file_type           VARCHAR(10),
    uploaded_at         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5. Programs
```sql
CREATE TABLE "Programs" (
    program_id      VARCHAR(10)     PRIMARY KEY,         -- e.g. PRG0001
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    duration_weeks  INTEGER,
    start_date      DATE,
    end_date        DATE,
    created_by      VARCHAR(10)     REFERENCES "User"(user_id),
    assigned_mentor VARCHAR(10)     REFERENCES "Mentor"(mentor_profile_id),
    status          VARCHAR(15)     DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
    cover_image     VARCHAR(500),                           -- Cloudinary URL
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

### 6. Session
```sql
CREATE TABLE "Session" (
    session_id          VARCHAR(10)     PRIMARY KEY,     -- e.g. SES0001
    program_id          VARCHAR(10)     NOT NULL REFERENCES "Programs"(program_id),
    mentor_id           VARCHAR(10)     NOT NULL REFERENCES "Mentor"(mentor_profile_id),
    title               VARCHAR(200)    NOT NULL,
    description         TEXT,
    session_type        VARCHAR(10)     NOT NULL CHECK (session_type IN ('live', 'recorded')),
    scheduled_at        TIMESTAMP,                       -- live sessions only
    meeting_link        VARCHAR(255),                    -- live sessions only
    video_url           VARCHAR(255),                    -- recorded sessions only
    duration_minutes    INTEGER,
    cover_image         VARCHAR(500),                       -- Cloudinary URL
    status              VARCHAR(15)     DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

### 7. Enrollment
> `status` can be `active`, `completed`, or `certificate_eligible`

```sql
CREATE TABLE "Enrollment" (
    enrollment_id   VARCHAR(20)     PRIMARY KEY,         -- e.g. 26PRG00010001
    user_id         VARCHAR(10)     NOT NULL REFERENCES "User"(user_id),
    program_id      VARCHAR(10)     NOT NULL REFERENCES "Programs"(program_id),
    enrollment_date TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    status          VARCHAR(15)     DEFAULT 'active'     -- active | pending | completed | certificate_eligible
);
```

---

### 8. Attendence
> Table name retains original spelling. Includes auto-attendance fields for live session tracking.

```sql
CREATE TABLE "Attendence" (
    attendance_id           VARCHAR(10)     PRIMARY KEY,    -- e.g. ATT0001
    session_id              VARCHAR(10)     NOT NULL REFERENCES "Session"(session_id),
    user_id                 VARCHAR(10)     NOT NULL REFERENCES "User"(user_id),
    status                  VARCHAR(10)     NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent')),
    marked_at               TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    join_intervals          TEXT            DEFAULT '[]',   -- JSON: [{"join": "ISO", "leave": "ISO"}, ...]
    total_minutes_present   INTEGER         DEFAULT 0,
    is_auto_marked          VARCHAR(5)      DEFAULT 'false' -- "true" if system marked, "false" if manual
);
```

---

### 9. VideoProgress
> Tracks watched segments for recorded sessions. Used to enforce anti-skip 95% completion rule.

```sql
CREATE TABLE "VideoProgress" (
    progress_id         VARCHAR(10)     PRIMARY KEY,        -- e.g. VP0001
    user_id             VARCHAR(10)     NOT NULL REFERENCES "User"(user_id),
    session_id          VARCHAR(10)     NOT NULL REFERENCES "Session"(session_id),
    watched_segments    TEXT            DEFAULT '[]',        -- JSON: [[start_sec, end_sec], ...]
    total_watched       INTEGER         DEFAULT 0,           -- unique seconds watched
    last_updated        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_id)
);
```

---

### 10. SessionCompletion
> Records when a mentee has fully completed a recorded session (≥95% watched).

```sql
CREATE TABLE "SessionCompletion" (
    completion_id   VARCHAR(10)     PRIMARY KEY,            -- e.g. SC0001
    user_id         VARCHAR(10)     NOT NULL REFERENCES "User"(user_id),
    session_id      VARCHAR(10)     NOT NULL REFERENCES "Session"(session_id),
    program_id      VARCHAR(10)     NOT NULL REFERENCES "Programs"(program_id),
    completed       BOOLEAN         DEFAULT FALSE,
    completed_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

### 11. feedback
> Stores mentee ratings and comments for sessions. Table name is lowercase.

```sql
CREATE TABLE "feedback" (
    feedback_id     VARCHAR(10)     PRIMARY KEY,            -- e.g. FBK0001
    session_id      VARCHAR(10),
    mentee_user_id  VARCHAR(10),
    rating          INTEGER,                                -- 1–5
    comments        VARCHAR(500)
);
```

---

### 12. announcements
> Platform-wide announcements created by admins. Table name is lowercase plural.

```sql
CREATE TABLE "announcements" (
    announcement_id VARCHAR(10)     PRIMARY KEY,            -- e.g. ANN0001
    title           VARCHAR(200),
    message         VARCHAR(1000),
    created_by      VARCHAR(10),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

### 13. notifications
> Per-user in-app notifications. Table name is lowercase plural.

```sql
CREATE TABLE "notifications" (
    notification_id VARCHAR(10)     PRIMARY KEY,            -- e.g. NTF0001
    user_id         VARCHAR(10),
    title           VARCHAR(200),
    message         VARCHAR(500),
    notif_type      VARCHAR(50),                            -- e.g. enrollment, session, certificate
    is_read         BOOLEAN         DEFAULT FALSE,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    link            VARCHAR(200)                            -- optional deep-link URL
);
```

---

### 14. Certificate
> **Note:** This table is not currently used by the application. Certificate eligibility is tracked via `Enrollment.status = 'certificate_eligible'`. This table is included for future use if certificate records need to be stored separately.

```sql
CREATE TABLE "Certificate" (
    certificate_id  VARCHAR(10)     PRIMARY KEY,            -- e.g. CTR0001
    user_id         VARCHAR(10)     REFERENCES "User"(user_id),
    program_id      VARCHAR(10)     REFERENCES "Programs"(program_id),
    certificate_url VARCHAR(255),
    issued_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

### 15. PasswordResetToken
> Stores single-use tokens for the forgot-password flow.

```sql
CREATE TABLE "PasswordResetToken" (
    token       VARCHAR(64)     PRIMARY KEY,
    user_id     VARCHAR(10)     NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
    is_used     BOOLEAN         DEFAULT FALSE,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMP       NOT NULL
);
```

---

### 16. Resource
> Uploaded files (PDF, video, image, etc.) scoped globally or to a specific program/session.

```sql
CREATE TABLE "Resource" (
    resource_id     VARCHAR(10)     PRIMARY KEY,            -- e.g. RES0001
    title           VARCHAR(200)    NOT NULL,
    description     TEXT,
    file_url        VARCHAR(500)    NOT NULL,
    file_type       VARCHAR(20),                            -- pdf, doc, ppt, image, video, excel, txt, file
    scope           VARCHAR(10)     DEFAULT 'global',       -- global | program
    program_id      VARCHAR(10)     REFERENCES "Programs"(program_id),
    session_id      VARCHAR(10)     REFERENCES "Session"(session_id),
    uploaded_by     VARCHAR(10)     NOT NULL REFERENCES "User"(user_id),
    uploaded_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

### 17. EmailOTP
> Stores one-time passwords used for email verification at signup.

```sql
CREATE TABLE "EmailOTP" (
    otp_id      VARCHAR(10)     PRIMARY KEY,                -- e.g. OTP0001
    user_id     VARCHAR(10)     NOT NULL,
    otp_code    VARCHAR(6)      NOT NULL,
    expires_at  TIMESTAMP       NOT NULL,
    is_used     BOOLEAN         DEFAULT FALSE,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

---

## Admin Seed User

After creating all tables, insert the admin user. Generate a bcrypt hash of the password first, then run:

```sql
INSERT INTO "User" (user_id, full_name, email, password_hash, role, status)
VALUES ('26001', 'Admin', 'admin@gmail.com', '<BCRYPT_HASH>', 'admin', 'active');
```

To generate a bcrypt hash in Python:
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
print(pwd_context.hash("YourPasswordHere"))
```

---

## Changelog

| Version | Change |
|---------|--------|
| 1.0 | Initial schema |
| 1.1 | Added `join_intervals`, `total_minutes_present`, `is_auto_marked` to `Attendence`; added `VideoProgress` and `SessionCompletion` tables; updated `Enrollment.status` to support `certificate_eligible`; fixed `MentorInvite` FK constraints to `ON DELETE SET NULL` |
| 1.2 | Added `PasswordResetToken` table for forgot password flow; added `Resource` table |
| 1.4 | Fixed `User.status` CHECK to include `'unverified'` (set at signup before OTP verified); fixed `Enrollment.status` from `VARCHAR(25)` to `VARCHAR(15)`; removed `UNIQUE(user_id, program_id)` from `Enrollment` (not in ORM model, not in actual DB); fixed `Notification.user_id` from untyped `String` to `VARCHAR(10)` in model |
| 1.3 | Fixed `feedback` table name (lowercase) and columns (`mentee_user_id`, `rating`, `comments`); fixed `announcements` table name (lowercase plural) and columns (`message`, `created_by`, `created_at`); fixed `notifications` table name (lowercase plural), PK renamed to `notification_id`, added `notif_type` and `link` columns; updated `Resource` columns to match actual model (`scope`, `session_id`, `uploaded_at`; removed `resource_type`, `link_url`, `text_content`, `uploaded_by_role`); added `EmailOTP` table; fixed SQL code block formatting throughout; removed incorrect FK REFERENCES from `feedback`, `announcements`, `notifications`, `EmailOTP` (models do not declare ForeignKey for those columns); added `NOT NULL` to `MentorCertificate.mentor_profile_id` |
