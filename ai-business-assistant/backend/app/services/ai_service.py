from openai import AsyncOpenAI
from typing import List, Optional, Tuple
import tiktoken
import json

from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are an intelligent AI Business Assistant. Your role is to:

1. Answer questions about company policies, procedures, and documentation
2. Help employees find information quickly and accurately
3. Generate professional emails, proposals, and reports
4. Summarize documents and create meeting notes
5. Analyze data and suggest workflow improvements
6. Draft business communications and presentations

Guidelines:
- Be professional, concise, and accurate
- When using information from documents, cite the source
- If you're unsure about something, say so clearly
- Format responses clearly with headers and bullet points when appropriate
- For sensitive topics, recommend consulting the appropriate department
- Always maintain a helpful and professional tone

When document context is provided, prioritize that information for your answers."""


def count_tokens(text: str, model: str = "gpt-4o") -> int:
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception:
        return len(text) // 4  # Rough estimate


async def generate_response(
    messages: List[dict],
    document_context: Optional[str] = None,
    stream: bool = False
) -> Tuple[str, int]:
    """Generate AI response with optional document context."""

    system_content = SYSTEM_PROMPT
    if document_context:
        system_content += f"\n\n--- RELEVANT DOCUMENT CONTEXT ---\n{document_context}\n--- END CONTEXT ---"

    full_messages = [
        {"role": "system", "content": system_content},
        *messages
    ]

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=full_messages,
        max_tokens=settings.MAX_TOKENS,
        temperature=settings.TEMPERATURE,
    )

    content = response.choices[0].message.content
    tokens = response.usage.total_tokens if response.usage else 0

    return content, tokens


async def generate_conversation_title(first_message: str) -> str:
    """Auto-generate a conversation title from the first message."""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": f"Generate a short, descriptive title (max 6 words) for a conversation that starts with: '{first_message}'. Return only the title, no quotes."
                }
            ],
            max_tokens=20,
            temperature=0.5,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return first_message[:50] + ("..." if len(first_message) > 50 else "")


async def summarize_document(content: str, filename: str) -> str:
    """Summarize a document's content."""
    truncated = content[:8000] if len(content) > 8000 else content

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a document summarization expert. Create clear, structured summaries."
            },
            {
                "role": "user",
                "content": f"Please provide a comprehensive summary of this document titled '{filename}':\n\n{truncated}"
            }
        ],
        max_tokens=1000,
        temperature=0.3,
    )

    return response.choices[0].message.content


async def search_documents_for_context(query: str, documents: List[dict]) -> Tuple[str, List[dict]]:
    """Search through document content to find relevant context."""
    if not documents:
        return "", []

    relevant_sources = []
    context_parts = []

    # Simple keyword-based search (in production, use vector embeddings)
    query_lower = query.lower()
    query_words = set(query_lower.split())

    for doc in documents:
        content = doc.get("content_text", "") or ""
        if not content:
            continue

        content_lower = content.lower()
        # Score based on keyword matches
        score = sum(1 for word in query_words if word in content_lower)

        if score > 0:
            # Extract relevant paragraphs
            paragraphs = content.split("\n\n")
            relevant_paragraphs = [
                p for p in paragraphs
                if any(word in p.lower() for word in query_words)
            ][:3]  # Max 3 paragraphs per doc

            if relevant_paragraphs:
                context_parts.append(f"[From: {doc['original_filename']}]\n" + "\n".join(relevant_paragraphs))
                relevant_sources.append({
                    "id": doc["id"],
                    "filename": doc["original_filename"],
                    "relevance_score": score
                })

    # Sort by relevance
    relevant_sources.sort(key=lambda x: x["relevance_score"], reverse=True)
    context = "\n\n".join(context_parts[:5])  # Max 5 document excerpts

    return context, relevant_sources[:3]
