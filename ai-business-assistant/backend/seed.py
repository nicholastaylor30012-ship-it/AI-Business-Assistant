"""
Seed script — creates default admin and staff users.
Run: python seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import AsyncSessionLocal, create_tables
from app.models.user import User, UserRole
from app.core.security import hash_password


SEED_USERS = [
    {
        "email": "admin@company.com",
        "full_name": "System Admin",
        "password": "Admin123!",
        "role": UserRole.admin,
        "department": "IT",
    },
    {
        "email": "staff@company.com",
        "full_name": "Demo Staff",
        "password": "Staff123!",
        "role": UserRole.staff,
        "department": "Operations",
    },
]


async def seed():
    await create_tables()

    async with AsyncSessionLocal() as session:
        from sqlalchemy import select

        for user_data in SEED_USERS:
            result = await session.execute(
                select(User).where(User.email == user_data["email"])
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"  ⟳  {user_data['email']} already exists — skipping")
                continue

            user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=hash_password(user_data["password"]),
                role=user_data["role"],
                department=user_data["department"],
                is_active=True,
            )
            session.add(user)
            print(f"  ✓  Created {user_data['role'].value}: {user_data['email']}")

        await session.commit()

    print("\nSeeding complete.")
    print("─" * 40)
    print("Admin  → admin@company.com  / Admin123!")
    print("Staff  → staff@company.com  / Staff123!")
    print("─" * 40)
    print("Remember to change these passwords in production!")


if __name__ == "__main__":
    asyncio.run(seed())
