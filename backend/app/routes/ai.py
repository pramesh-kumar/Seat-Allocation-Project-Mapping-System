from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app import schemas, ai_parser
from app.database import get_db
from app.auth import get_current_role

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])

@router.post("/query", response_model=schemas.AIQueryResponse)
def execute_ai_query(
    request: schemas.AIQueryRequest,
    x_user_role: str = Header(default="Employee"),
    db: Session = Depends(get_db)
):
    role = get_current_role(x_user_role)
    response = ai_parser.parse_and_execute_query(db, request.query, user_role=role)
    return response
