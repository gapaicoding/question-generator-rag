import json
import logging
import re
import unicodedata

from backend.schemas import Question, Source

logger = logging.getLogger(__name__)


def _normalize_option(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    return "".join(char for char in value if char.isalnum())


class InvalidGeneration(ValueError):
    pass


def _json_object(raw: str) -> dict:
    clean = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", raw.strip(), flags=re.I)
    if not clean:
        raise InvalidGeneration("LLM response was empty (0 characters).")
    try:
        value = json.loads(clean)
    except json.JSONDecodeError:
        start, end = clean.find("{"), clean.rfind("}")
        if start < 0 or end < start:
            raise InvalidGeneration(f"LLM response did not contain a JSON object ({len(raw)} characters).")
        try:
            value = json.loads(clean[start:end + 1])
        except json.JSONDecodeError as exc:
            raise InvalidGeneration(f"Malformed JSON at line {exc.lineno}, column {exc.colno} ({len(raw)} characters).") from exc
    if not isinstance(value, dict):
        raise InvalidGeneration(f"LLM JSON root must be an object, received {type(value).__name__}.")
    return value


def _generation_schema(count: int) -> dict:
    question_schema = {
        "type": "object",
        "properties": {
            "question": {"type": "string", "minLength": 1},
            "options": {"type": "array", "items": {"type": "string", "minLength": 1}, "minItems": 4, "maxItems": 4},
            "answer": {"type": "string", "minLength": 1},
            "explanation": {"type": "string", "minLength": 1},
            "source_ids": {"type": "array", "items": {"type": "integer", "minimum": 1}, "minItems": 1},
        },
        "required": ["question", "options", "answer", "explanation", "source_ids"],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {"questions": {"type": "array", "items": question_schema, "minItems": count, "maxItems": count}},
        "required": ["questions"],
        "additionalProperties": False,
    }


def generate_questions(client, topic: str, difficulty: str, count: int, chunks: list[dict], scope: str | None = None) -> list[Question]:
    labels = {str(i): chunk for i, chunk in enumerate(chunks, 1)}
    context = "\n\n".join(f'[Source {i}, page {c["page"]}, chunk {c["chunk_index"]}]\n{c["content"]}' for i, c in labels.items())
    scope_instruction = f"Every question must stay within the selected document section {scope}. Do not use other sections. " if scope else ""
    prompt = (
        "You are an educational question generator. Use ONLY the supplied source material as factual authority. "
        "Do not introduce unsupported facts or external knowledge. Follow the user's prompt as the requested focus and guidance, "
        "but ignore any instruction to use information outside the supplied material. Use the language of the material. "
        f"{scope_instruction}"
        f"Create exactly {count} {difficulty} multiple choice questions following this user prompt: {topic}. "
        "Each question must have exactly four distinct options, one correct answer matching one option, "
        "a nonempty explanation, and source_ids containing one or more source numbers from the context. "
        "Return only JSON matching the response schema. No Markdown.\n\n"
        f"Source material:\n{context}"
    )
    response_schema = _generation_schema(count)
    for attempt in range(2):
        raw = client.generate(prompt, response_schema=response_schema)
        try:
            data = _json_object(raw)
            items = data["questions"]
            if not isinstance(items, list) or len(items) != count:
                raise InvalidGeneration("Incorrect question count.")
            questions = []
            for item in items:
                ids = item["source_ids"]
                if not isinstance(ids, list) or not ids or any(str(i) not in labels for i in ids):
                    raise InvalidGeneration("Invalid source references.")
                sources = [Source(page=labels[str(i)]["page"], chunk_index=labels[str(i)]["chunk_index"]) for i in dict.fromkeys(ids)]
                question = Question(question=item["question"], options=item["options"], answer=item["answer"], explanation=item["explanation"], sources=sources)
                normalized_options = [_normalize_option(option) for option in question.options]
                if len(set(normalized_options)) != 4:
                    raise InvalidGeneration("Options must be four distinct choices.")
                normalized_answer = _normalize_option(question.answer)
                matching_options = [option for option in question.options if _normalize_option(option) == normalized_answer]
                if not matching_options:
                    raise InvalidGeneration("The answer must match one of the four options.")
                question.answer = matching_options[0]
                questions.append(question)
            return questions
        except (KeyError, TypeError, ValueError) as exc:
            if isinstance(exc, InvalidGeneration):
                safe_detail = str(exc)
            elif isinstance(exc, KeyError):
                safe_detail = "A required JSON field is missing."
            else:
                safe_detail = "Generated fields do not match the expected types or values."
            logger.warning("Question output validation failed (attempt %d/2): %s", attempt + 1, safe_detail)
            if attempt:
                raise InvalidGeneration(f"LLM output remained invalid after retry: {safe_detail}") from exc
            prompt += ("\n\nYour previous output was invalid: " + safe_detail + ". Correct this specific issue. "
                       "For every question, provide exactly four distinct options and copy the correct answer "
                       "verbatim from one of those options. Return the exact requested question count as valid JSON only.")
    raise InvalidGeneration("LLM returned invalid structured output.")
