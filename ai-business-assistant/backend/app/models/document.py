from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, BigInteger, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, docx, xlsx, etc.
    file_size = Column(BigInteger, default=0)
    mime_type = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    content_text = Column(Text, nullable=True)  # Extracted text content
    is_processed = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    tags = Column(JSON, default=[])
    metadata_ = Column("metadata", JSON, default={})
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    uploaded_by_user = relationship("User", back_populates="documents", foreign_keys=[uploaded_by])
