from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from datetime import datetime, timezone

from app.models.user import User
from app.core.security import hash_password, verify_password
from app.schemas import UserCreate, UserUpdate


class UserService:

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[User]:
        result = await db.execute(select(User).offset(skip).limit(limit).order_by(User.created_at.desc()))
        return result.scalars().all()

    @staticmethod
    async def create(db: AsyncSession, user_data: UserCreate) -> User:
        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hash_password(user_data.password),
            role=user_data.role,
            department=user_data.department,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def update(db: AsyncSession, user: User, update_data: UserUpdate) -> User:
        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(user, field, value)
        user.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> Optional[User]:
        user = await UserService.get_by_email(db, email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await db.flush()
        return user

    @staticmethod
    async def delete(db: AsyncSession, user_id: int) -> bool:
        user = await UserService.get_by_id(db, user_id)
        if not user:
            return False
        await db.delete(user)
        return True

    @staticmethod
    async def count(db: AsyncSession) -> int:
        result = await db.execute(select(func.count(User.id)))
        return result.scalar_one()

    @staticmethod
    async def count_active(db: AsyncSession) -> int:
        result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
        return result.scalar_one()
