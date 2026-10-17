import requests

from backend.config import settings


class OllamaError(Exception):
    pass


class OllamaClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.ollama_base_url

    def _post(self, path: str, payload: dict) -> dict:
        try:
            response = requests.post(f"{self.base_url}{path}", json=payload, timeout=settings.ollama_timeout_seconds)
            if response.status_code == 404 or (response.status_code == 400 and "model" in response.text.lower()):
                raise OllamaError("Required Ollama model is not installed.")
            if not response.ok:
                detail = response.text.strip().replace("\r", " ").replace("\n", " ")[:400]
                raise OllamaError(f"Ollama returned HTTP {response.status_code}: {detail or 'no error details'}")
            return response.json()
        except requests.ConnectionError as exc:
            raise OllamaError("Ollama service is unavailable.") from exc
        except requests.Timeout as exc:
            raise OllamaError("Ollama request timed out. Check that the model is loaded and try again.") from exc
        except requests.RequestException as exc:
            raise OllamaError(f"Ollama request failed: {exc}") from exc
        except ValueError as exc:
            raise OllamaError("Ollama returned invalid JSON.") from exc

    def available(self) -> bool:
        try:
            requests.get(f"{self.base_url}/api/tags", timeout=2).raise_for_status()
            return True
        except requests.RequestException:
            return False

    def embed(self, texts: list[str]) -> list[list[float]]:
        result = self._post("/api/embed", {"model": settings.embed_model, "input": texts})
        vectors = result.get("embeddings")
        if not isinstance(vectors, list) or len(vectors) != len(texts) or any(not vector for vector in vectors):
            raise OllamaError("Ollama returned invalid embeddings.")
        return vectors

    def generate(self, prompt: str) -> str:
        result = self._post("/api/generate", {"model": settings.llm_model, "prompt": prompt, "stream": False, "format": "json", "think": False, "options": {"temperature": 0, "num_predict": 1400}})
        if not isinstance(result.get("response"), str):
            raise OllamaError("Ollama returned invalid generation output.")
        return result["response"]
