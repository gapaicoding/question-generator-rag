import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    llm_model: str = os.getenv("OLLAMA_LLM_MODEL", "qwen3:4b")
    embed_model: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    chroma_path: Path = Path(os.getenv("CHROMA_PATH", "./chroma_data"))
    upload_path: Path = Path(os.getenv("UPLOAD_PATH", "./uploads"))
    chunk_size: int = int(os.getenv("DEFAULT_CHUNK_SIZE", "1200"))
    chunk_overlap: int = int(os.getenv("DEFAULT_CHUNK_OVERLAP", "200"))
    top_k: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    max_retrieval_distance: float = float(os.getenv("MAX_RETRIEVAL_DISTANCE", "1.2"))
    ollama_timeout_seconds: int = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "300"))
    max_pdf_bytes: int = 25 * 1024 * 1024


settings = Settings()
