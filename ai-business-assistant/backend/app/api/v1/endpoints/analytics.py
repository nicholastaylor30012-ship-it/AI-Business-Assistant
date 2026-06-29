from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas import AnalyticsOverview

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar_one()
    total_conversations = (await db.execute(select(func.count(Conversation.id)))).scalar_one()
    total_messages = (await db.execute(select(func.count(Message.id)))).scalar_one()
    total_documents = (await db.execute(select(func.count(Document.id)).where(Document.is_active == True))).scalar_one()

    tokens_result = await db.execute(select(func.sum(Message.tokens_used)))
    total_tokens = tokens_result.scalar_one() or 0

    messages_today = (await db.execute(
        select(func.count(Message.id)).where(Message.created_at >= today_start)
    )).scalar_one()

    new_users = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_start)
    )).scalar_one()

    return AnalyticsOverview(
        total_users=total_users,
        active_users=active_users,
        total_conversations=total_conversations,
        total_messages=total_messages,
        total_documents=total_documents,
        total_tokens_used=total_tokens,
        messages_today=messages_today,
        new_users_this_week=new_users,
    )
