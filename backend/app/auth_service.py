"""
CarePulse Backend — auth_service.py
-----------------------------------
Service logic for looking up and authenticating database user credentials.
"""

from typing import Optional
from sqlalchemy.orm import Session
from app.models import User
from app.security import verify_password

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Look up a user in the database by their unique email address.
    """
    return db.query(User).filter(User.email == email).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user by validating their email and plaintext password.
    Returns the User ORM object if credentials are correct, otherwise returns None.
    """
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
