"""Exercise the published Python SDK against an in-memory HTTP transport."""

import base64

from importlib.metadata import version
from pathlib import Path
from tempfile import TemporaryDirectory

import httpx
from addisai import AddisAI


CLIP = {
    "id": "clip_test",
    "text": "ሰላም",
    "text_preview": "ሰላም",
    "voice_id": "am-hamen",
    "voice_name": "Hamen",
    "voice_descriptor": "Clear",
    "language": "am",
    "output_format": "mp3_44100",
    "audio_url": "https://cdn.test/clip.mp3",
    "mime_type": "audio/mpeg",
    "duration_seconds": 1.2,
    "character_count": 4,
    "billable_characters": 4,
    "download_name": "clip.mp3",
    "created_at": "2026-07-17T00:00:00Z",
    "usage": {
        "pricing_unit": "minute",
        "price_per_minute": 5,
        "credits_used": 0.1,
        "credits_remaining": 499.9,
        "currency": "ETB",
    },
}


def json_response(request, data, status=200):
    return httpx.Response(status, json=data, request=request)


def handler(request):
    path = request.url.path
    if request.url.host == "cdn.test":
        return httpx.Response(200, content=b"mock-audio", request=request)
    if path == "/api/v1/chat_generate":
        body = request.content.decode("utf-8", errors="ignore")
        if "get_weather" in body:
            return json_response(request, {
                "status": "success",
                "data": {
                    "response_text": "",
                    "tool_calls": [{
                        "id": "call_1",
                        "type": "function",
                        "function": {"name": "get_weather", "arguments": '{"city":"Addis Ababa"}'},
                    }],
                },
            })
        return json_response(request, {
            "status": "success",
            "data": {"response_text": "ሰላም", "finish_reason": "stop"},
        })
    if path == "/api/v1/voice/voices":
        return json_response(request, {"data": [{
            "id": "am-hamen",
            "name": "Hamen",
            "language": "am",
            "is_available": True,
        }]})
    if path == "/api/v1/voice/voices/am-hamen/preview":
        return json_response(request, {"data": {
            "voice_id": "am-hamen",
            "audio_url": "https://cdn.test/preview.mp3",
            "mime_type": "audio/mpeg",
        }})
    if path == "/api/v1/voice/estimate":
        return json_response(request, {"data": {
            "pricing_unit": "minute",
            "price_per_minute": 5,
            "estimated_duration_seconds": 1.2,
            "estimated_billable_seconds": 1.2,
            "estimated_cost": 0.1,
            "current_balance": 500,
            "estimated_balance_after": 499.9,
            "currency": "ETB",
            "can_generate": True,
        }})
    if path == "/api/v1/voice/generations":
        return json_response(request, {"data": CLIP}, 201)
    if path == "/api/v2/stt":
        return json_response(request, {"data": {
            "transcription": "ሰላም",
            "confidence": 0.99,
            "usage_metadata": {},
        }})
    if path == "/api/v1/translate":
        return json_response(request, {"data": {
            "translation": "ሰላም",
            "source_language": "en",
            "target_language": "am",
            "quality": "high",
            "usage_metadata": {},
        }})
    if path == "/api/v1/audio":
        return json_response(request, {
            "audio": base64.b64encode(b"legacy-audio").decode("ascii"),
        })
    raise AssertionError(f"Unexpected request: {request.method} {path}")


assert version("addisai") == "0.1.1"
http_client = httpx.Client(transport=httpx.MockTransport(handler))
addis = AddisAI(api_key="test-only", base_url="https://api.test", http_client=http_client)

response = addis.chat.completions.create(
    messages=[{"role": "user", "content": "በአማርኛ ሰላም በል"}],
)
assert response["choices"][0]["message"]["content"] == "ሰላም"

voice_input = {
    "text": "ሰላም",
    "voice_id": "am-hamen",
    "language": "am",
    "output_format": "mp3_44100",
}
estimate = addis.voice.estimate(**voice_input)
assert estimate["can_generate"] and estimate["pricing_unit"] == "minute"
clip = addis.voice.generate(**voice_input, client_request_id="test-operation")
assert clip.voice_id == "am-hamen" and clip.usage["pricing_unit"] == "minute"
# Published 0.1.1 drops the backend's price_per_minute field; the docs disclose it.
assert "price_per_minute" not in clip.usage
with TemporaryDirectory() as directory:
    output = Path(directory) / "speech.mp3"
    clip.to_file(str(output))
    assert output.read_bytes() == b"mock-audio"

catalog = addis.voices.list(language="am")
assert catalog[0]["id"] == "am-hamen"
preview = addis.voices.preview("am-hamen")
assert preview["audio_url"].startswith("https://")

transcription = addis.speech.transcribe(audio=b"audio", language="am")
assert transcription["text"] == "ሰላም"
translation = addis.translate.create(text="Hello", source="en", target="am")
assert translation["text"] == "ሰላም"

legacy_audio = addis.legacy.audio.generate(text="ሰላም", language="am")
with TemporaryDirectory() as directory:
    output = Path(directory) / "legacy-speech.wav"
    legacy_audio.to_file(str(output))
    assert output.read_bytes() == b"legacy-audio"

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "parameters": {"type": "object", "properties": {"city": {"type": "string"}}},
    },
}]
tool_response = addis.chat.completions.create(
    messages=[{"role": "user", "content": "Use get_weather."}],
    tools=tools,
    tool_choice="required",
)
assert tool_response["choices"][0]["message"]["tool_calls"][0]["function"]["name"] == "get_weather"

addis.close()
