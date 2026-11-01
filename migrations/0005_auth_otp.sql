-- 0005 — auth hardening: OTP attempt counters.
--
-- Email verification and password reset both move to 6-digit OTP codes
-- (hashed at rest, short-lived, resend cooldown). The attempts column caps
-- online guessing: the route layer locks a code after too many wrong tries.
ALTER TABLE email_verification_tokens ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE password_reset_tokens ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
