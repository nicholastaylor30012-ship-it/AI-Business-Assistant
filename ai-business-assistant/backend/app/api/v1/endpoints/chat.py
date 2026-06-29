from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas import (
    ChatRequest, ChatResponse, ConversationCreate, ConversationUpdate,
    ConversationResponse, ConversationDetailResponse, MessageResponse
)
from app.services.ai_service import (
    generate_response, generate_conversation_title, search_documents_for_context
)

router = APIRouter()


@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get or create conversation
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == request.conversation_id,
                Conversation.user_id == current_user.id
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        title = await generate_conversation_title(request.message)
        conversation = Conversation(
            user_id=current_user.id,
            title=title
        )
        db.add(conversation)
        await db.flush()

    # Load conversation history (last 10 messages)
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    history = list(reversed(history_result.scalars().all()))

    # Save user message
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    await db.flush()

    # Fetch active documents for context
    docs_result = await db.execute(
        select(Document).where(Document.is_active == True, Document.is_processed == True)
    )
    documents = docs_result.scalars().all()

    doc_dicts = [
        {
            "id": doc.id,
            "original_filename": doc.original_filename,
            "content_text": doc.content_text or ""
        }
        for doc in documents
    ]

    # Search documents for relevant context
    doc_context, sources = await search_documents_for_context(request.message, doc_dicts)

    # Build message history for AI
    ai_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in history
    ]
    ai_messages.append({"role": "user", "content": request.message})

    # Generate AI response
    ai_content, tokens_used = await generate_response(ai_messages, doc_context)

    # Save assistant message
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_content,
        tokens_used=tokens_used,
        model_used="gpt-4o",
        sources=sources
    )
    db.add(assistant_message)
    await db.flush()
    await db.refresh(user_message)
    await db.refresh(assistant_message)

    return ChatResponse(
        conversation_id=conversation.id,
        message=MessageResponse.model_validate(user_message),
        assistant_message=MessageResponse.model_validate(assistant_message)
    )


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Conversation).where(
        Conversation.user_id == current_user.id,
        Conversation.is_archived == False
    )

    if search:
        query = query.where(Conversation.title.ilike(f"%{search}%"))

    query = query.order_by(Conversation.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    conversations = result.scalars().all()

    # Get message counts
    response = []
    for conv in conversations:
        count_result = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conv.id)
        )
        count = count_result.scalar_one()
        conv_response = ConversationResponse.model_validate(conv)
        conv_response.message_count = count
        response.append(conv_response)

    return response


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = messages_result.scalars().all()

    response = ConversationDetailResponse.model_validate(conversation)
    response.message_count = len(messages)
    response.messages = [MessageResponse.model_validate(m) for m in messages]
    return response


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    update_data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(conversation, field, value)

    await db.flush()
    await db.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conversation)
