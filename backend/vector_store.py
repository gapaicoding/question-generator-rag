import chromadb

from backend.config import settings


class VectorStore:
    def __init__(self, path=None):
        self.collection = chromadb.PersistentClient(path=str(path or settings.chroma_path)).get_or_create_collection("pdf_materials")

    def add(self, chunks: list[dict], embeddings: list[list[float]]) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("Chunk and embedding counts differ.")
        for start in range(0, len(chunks), 100):
            batch = chunks[start:start + 100]
            self.collection.add(
                ids=[f'{c["document_id"]}:{c["page"]}:{c["chunk_index"]}' for c in batch],
                documents=[c["content"] for c in batch],
                embeddings=embeddings[start:start + 100],
                metadatas=[{key: c[key] for key in ("document_id", "filename", "page", "chunk_index")} for c in batch],
            )

    def exists(self, document_id: str) -> bool:
        return bool(self.collection.get(where={"document_id": document_id}, limit=1)["ids"])

    def search(self, document_id: str, embedding: list[float], top_k: int) -> list[dict]:
        count = len(self.collection.get(where={"document_id": document_id})["ids"])
        if not count:
            return []
        result = self.collection.query(query_embeddings=[embedding], n_results=min(top_k, count), where={"document_id": document_id}, include=["documents", "metadatas", "distances"])
        return [{"content": content, "page": meta["page"], "chunk_index": meta["chunk_index"], "distance": distance} for content, meta, distance in zip(result["documents"][0], result["metadatas"][0], result["distances"][0])]

    def delete(self, document_id: str) -> None:
        self.collection.delete(where={"document_id": document_id})
