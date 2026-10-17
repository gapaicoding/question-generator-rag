from typing import Literal

from pydantic import BaseModel, Field


class DocumentResponse(BaseModel):
    document_id: str
    filename: str
    pages: int
    chunks: int
    sections: list[str] = Field(default_factory=list)
    status: Literal["indexed"] = "indexed"


class SearchRequest(BaseModel):
    document_id: str
    query: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    content: str
    page: int
    chunk_index: int
    distance: float
    section: str = ""


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]


class GenerateRequest(BaseModel):
    document_id: str
    topic: str = Field(min_length=1, max_length=500)
    scope: str | None = Field(default=None, max_length=100)
    question_count: int = Field(default=5, ge=1, le=20)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    type: Literal["multiple_choice"] = "multiple_choice"


class Source(BaseModel):
    page: int
    chunk_index: int | None = None


class Question(BaseModel):
    question: str = Field(min_length=1)
    options: list[str] = Field(min_length=4, max_length=4)
    answer: str = Field(min_length=1)
    explanation: str = Field(min_length=1)
    sources: list[Source] = Field(min_length=1)


class GenerateResponse(BaseModel):
    document_id: str
    topic: str
    difficulty: str
    questions: list[Question]
