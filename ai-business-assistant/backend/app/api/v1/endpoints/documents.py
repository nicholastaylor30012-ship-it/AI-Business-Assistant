from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pathlib import Path

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.user import User
from app.models.document import Document
from app.schemas import DocumentResponse
from app.services.document_service import save_upload_file, extract_text_from_file, delete_file

router = APIRouter()


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # comma-separated
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ext = Path(file.filename).suffix.lower().lstrip(".")
    filename, file_path, file_size = await save_upload_file(file)

    # Extract text asynchronously
    content_text = await extract_text_from_file(file_path, ext)

    tag_list = [t.strip() for t in tags.split(",")] if tags else []

    document = Document(
        filename=filename,
        original_filename=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
        mime_type=file.content_type,
        description=description,
        content_text=content_text,
        is_processed=content_text is not None,
        uploaded_by=current_user.id,
        tags=tag_list
    )

    db.add(document)
    await db.flush()
    await db.refresh(document)
    return DocumentResponse.model_validate(document)


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    file_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(Document.is_active == True)

    if file_type:
        query = query.where(Document.file_type == file_type)

    query = query.order_by(Document.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    documents = result.scalars().all()
    return [DocumentResponse.model_validate(doc) for doc in documents]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.is_active == True)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Only admin or uploader can delete
    if current_user.role != "admin" and document.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    delete_file(document.file_path)
    document.is_active = False
    await db.flush()
