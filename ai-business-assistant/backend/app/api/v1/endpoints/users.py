from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas import UserResponse, UserUpdate, UserCreate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Staff cannot change their own role
    if current_user.role != "admin":
        update_data.role = None
        update_data.is_active = None

    updated = await UserService.update(db, current_user, update_data)
    return UserResponse.model_validate(updated)
