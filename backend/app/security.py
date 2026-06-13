"""
CarePulse Backend — security.py
--------------------------------
Provides cryptographic helpers for password hashing and JWT token operations.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# ── Configuration variables ──────────────────────────────────
# SECRET_KEY should be set to a secure, random string in production.
# Expiry defaults to 8 hours (480 minutes) as required.
SECRET_KEY = os.getenv("SECRET_KEY", "carepulse_jwt_secret_key_demo_2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))

# ── Hashing Context ───────────────────────────────────────────
# passlib CryptContext handles salt generation and bcrypt hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password Utilities ────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored bcrypt password hash.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Generate a bcrypt hash of a plaintext password.
    """
    return pwd_context.hash(password)


# ── JWT Utilities ─────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a signed JWT access token containing the input payload.
    Adds an 'exp' claim for expiration verification.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
