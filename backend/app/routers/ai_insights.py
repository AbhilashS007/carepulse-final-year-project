from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import crud, schemas
from app.models import User
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/ai-insights",
    tags=["ai-insights"]
)

@router.get("", response_model=List[schemas.AIInsightOut])
def read_ai_insights(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve AI health insights for monitored patients, ordered by generation timestamp (newest first).
    Requires authentication.
    """
    insights = crud.get_all_ai_insights(db, skip=skip, limit=limit)
    return insights
