from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import crud, schemas

router = APIRouter(
    prefix="/ai-insights",
    tags=["ai-insights"]
)

@router.get("", response_model=List[schemas.AIInsightOut])
def read_ai_insights(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retrieve AI health insights for monitored patients, ordered by generation timestamp (newest first).
    """
    insights = crud.get_all_ai_insights(db, skip=skip, limit=limit)
    return insights
