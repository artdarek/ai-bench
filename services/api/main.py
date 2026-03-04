import json
import os
import uuid
import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from openai import AzureOpenAI, OpenAI
from pydantic import BaseModel, Field

_HERE = Path(__file__).resolve().parent
_BASE_CANDIDATES = [
    _HERE.parent.parent,  # local: <repo>/services/api/main.py -> <repo>
    _HERE,  # docker: /app/main.py -> /app
]

BASE_DIR = next((candidate for candidate in _BASE_CANDIDATES if (candidate / 'config' / 'providers.json').exists()), _HERE)
CONFIG_PATH = BASE_DIR / 'config' / 'providers.json'
SNAPSHOTS_DIR = BASE_DIR / 'data' / 'snapshots'
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR = BASE_DIR / 'services' / 'website'
load_dotenv(BASE_DIR / '.env')
SUPPORTED_TEXT_ATTACHMENT_EXTENSIONS = {
    'c', 'cpp', 'cs', 'css', 'csv', 'go', 'html', 'java', 'js', 'json',
    'md', 'php', 'py', 'rb', 'sh', 'tex', 'ts', 'txt', 'xml',
}
SUPPORTED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
SUPPORTED_FILE_ATTACHMENT_EXTENSIONS = {'pdf'}
MAX_TEXT_ATTACHMENT_CHARS = 200_000


class SnapshotRequest(BaseModel):
    history: list[dict] = Field(default_factory=list)


class ChatRequest(BaseModel):
    provider: str = Field(pattern='^(openai|azure)$')
    model: str | None = None
    deployment: str | None = None
    api_key: str | None = None
    system_prompt: str = Field(default='')
    message: str = Field(min_length=1)
    history_messages: list[dict[str, str]] = Field(default_factory=list)
    attachments: list[dict[str, str]] = Field(default_factory=list)


class UsageDto(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    input_cached_tokens: int = 0
    input_non_cached_tokens: int = 0


class CostDto(BaseModel):
    input_cost_usd: float = 0.0
    input_non_cached_cost_usd: float = 0.0
    input_cached_cost_usd: float = 0.0
    output_cost_usd: float = 0.0
    total_cost_usd: float = 0.0


app = FastAPI(title='AI Bench')
app.mount('/static', StaticFiles(directory=str(STATIC_DIR)), name='static')


def load_provider_config() -> dict[str, Any]:
    with CONFIG_PATH.open('r', encoding='utf-8') as f:
        return json.load(f)


def get_pricing(provider_cfg: dict[str, Any], model_name: str) -> dict[str, float]:
    pricing = provider_cfg.get('pricing', {}).get(model_name)
    if not pricing:
        return {'input_per_1m_tokens_usd': 0.0, 'input_cached_per_1m_tokens_usd': 0.0, 'output_per_1m_tokens_usd': 0.0}
    input_price = float(pricing.get('input_per_1m_tokens_usd', 0.0))
    return {
        'input_per_1m_tokens_usd': input_price,
        'input_cached_per_1m_tokens_usd': float(pricing.get('input_cached_per_1m_tokens_usd', input_price)),
        'output_per_1m_tokens_usd': float(pricing.get('output_per_1m_tokens_usd', 0.0)),
    }


def estimate_cost(usage: UsageDto, pricing: dict[str, float]) -> CostDto:
    non_cached_cost = (usage.input_non_cached_tokens / 1_000_000) * pricing['input_per_1m_tokens_usd']
    cached_cost = (usage.input_cached_tokens / 1_000_000) * pricing['input_cached_per_1m_tokens_usd']
    input_cost = non_cached_cost + cached_cost
    output_cost = (usage.output_tokens / 1_000_000) * pricing['output_per_1m_tokens_usd']
    return CostDto(
        input_cost_usd=round(input_cost, 8),
        input_non_cached_cost_usd=round(non_cached_cost, 8),
        input_cached_cost_usd=round(cached_cost, 8),
        output_cost_usd=round(output_cost, 8),
        total_cost_usd=round(input_cost + output_cost, 8),
    )


def normalize_history_messages(items: list[dict[str, str]] | None) -> list[dict[str, str]]:
    if not items:
        return []

    normalized: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        role = str(item.get('role', '')).strip().lower()
        content = str(item.get('content', '')).strip()
        if role not in {'user', 'assistant'} or not content:
            continue
        normalized.append({'role': role, 'content': content})
    return normalized


def get_field(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def normalize_attachment_items(items: list[dict[str, str]] | None) -> list[dict[str, str]]:
    if not items:
        return []

    normalized: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        filename = str(item.get('filename', '')).strip()
        file_data = str(item.get('file_data', '')).strip()
        if not filename or not file_data:
            continue
        extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if extension in SUPPORTED_IMAGE_EXTENSIONS:
            attachment_kind = 'image'
        elif extension in SUPPORTED_FILE_ATTACHMENT_EXTENSIONS:
            attachment_kind = 'file'
        elif extension in SUPPORTED_TEXT_ATTACHMENT_EXTENSIONS:
            attachment_kind = 'text'
        else:
            allowed_exts = ', '.join(
                sorted(SUPPORTED_TEXT_ATTACHMENT_EXTENSIONS | SUPPORTED_IMAGE_EXTENSIONS | SUPPORTED_FILE_ATTACHMENT_EXTENSIONS)
            )
            raise HTTPException(
                status_code=400,
                detail=f'Unsupported attachment type for "{filename}". Allowed extensions: {allowed_exts}.',
            )
        mime_type = str(item.get('mime_type', '')).strip()
        if not file_data.startswith('data:'):
            resolved_mime = mime_type or 'application/octet-stream'
            file_data = f'data:{resolved_mime};base64,{file_data}'
        normalized.append({'filename': filename, 'file_data': file_data, 'mime_type': mime_type, 'kind': attachment_kind})
    return normalized


def decode_attachment_text(file_data: str) -> str:
    payload = file_data
    if file_data.startswith('data:'):
        if ',' not in file_data:
            raise HTTPException(status_code=400, detail='Attachment data URL is invalid.')
        payload = file_data.split(',', 1)[1]
    try:
        decoded = base64.b64decode(payload, validate=False)
    except Exception as exc:
        raise HTTPException(status_code=400, detail='Attachment base64 payload is invalid.') from exc
    return decoded.decode('utf-8', errors='replace')


def build_responses_input(messages: list[dict[str, str]], attachments: list[dict[str, str]] | None = None) -> list[dict[str, Any]]:
    response_input: list[dict[str, Any]] = []
    last_user_index = -1
    for index, message in enumerate(messages):
        if str(message.get('role', '')).strip() == 'user':
            last_user_index = index

    normalized_attachments = normalize_attachment_items(attachments)
    for index, message in enumerate(messages):
        role = str(message.get('role', '')).strip()
        content = str(message.get('content', ''))
        if not role or not content:
            continue
        content_type = 'output_text' if role == 'assistant' else 'input_text'
        content_items: list[dict[str, str]] = [{'type': content_type, 'text': content}]
        if normalized_attachments and role == 'user' and index == last_user_index:
            for attachment in normalized_attachments:
                if attachment.get('kind') == 'image':
                    content_items.append({'type': 'input_image', 'image_url': attachment['file_data'], 'detail': 'auto'})
                elif attachment.get('kind') == 'text':
                    attachment_text = decode_attachment_text(attachment['file_data'])
                    if len(attachment_text) > MAX_TEXT_ATTACHMENT_CHARS:
                        attachment_text = attachment_text[:MAX_TEXT_ATTACHMENT_CHARS]
                    content_items.append(
                        {
                            'type': 'input_text',
                            'text': f'Attachment ({attachment["filename"]}):\n{attachment_text}',
                        }
                    )
                else:
                    content_items.append(
                        {
                            'type': 'input_file',
                            'filename': attachment['filename'],
                            'file_data': attachment['file_data'],
                        }
                    )
        response_input.append({'role': role, 'content': content_items})
    return response_input


def extract_response_text(response: Any) -> str:
    output_text = get_field(response, 'output_text', '')
    if isinstance(output_text, str) and output_text:
        return output_text

    chunks: list[str] = []
    output_items = get_field(response, 'output', [])
    if not isinstance(output_items, list):
        return ''
    for output_item in output_items:
        content_items = get_field(output_item, 'content', [])
        if not isinstance(content_items, list):
            continue
        for content_item in content_items:
            text = get_field(content_item, 'text', None)
            if isinstance(text, str) and text:
                chunks.append(text)
    return ''.join(chunks)


def map_usage_from_response(response: Any) -> UsageDto:
    usage_data = get_field(response, 'usage', None)
    raw_input_tokens = int(get_field(usage_data, 'input_tokens', 0) or 0)
    input_details = get_field(usage_data, 'input_tokens_details', None)
    input_cached = int(get_field(input_details, 'cached_tokens', 0) or 0)
    output_tokens = int(get_field(usage_data, 'output_tokens', 0) or 0)
    total_tokens = int(get_field(usage_data, 'total_tokens', raw_input_tokens + output_tokens) or 0)

    return UsageDto(
        input_tokens=raw_input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        input_cached_tokens=input_cached,
        input_non_cached_tokens=max(0, raw_input_tokens - input_cached),
    )


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def normalize_azure_endpoint(raw_endpoint: str) -> str:
    endpoint = (raw_endpoint or '').strip()
    if not endpoint:
        return ''

    parts = urlsplit(endpoint)
    if not parts.scheme or not parts.netloc:
        return endpoint

    # AzureOpenAI client expects the resource base URL, without path suffixes
    # such as /openai/responses or /openai/v1.
    return f'{parts.scheme}://{parts.netloc}'


@app.get('/api/config')
def get_config() -> dict[str, Any]:
    cfg = load_provider_config()
    providers = cfg.get('providers', {})
    if isinstance(providers.get('openai'), dict):
        providers['openai']['server_key'] = bool(os.getenv('OPENAI_API_KEY', '').strip())
    if isinstance(providers.get('azure'), dict):
        providers['azure']['server_key'] = bool(os.getenv('AZURE_OPENAI_API_KEY', '').strip())
    return cfg


@app.post('/api/chat')
def run_chat(payload: ChatRequest) -> dict[str, Any]:
    requested_at = utc_now_iso()
    cfg = load_provider_config()
    provider_cfg = cfg.get('providers', {}).get(payload.provider)
    if not provider_cfg:
        raise HTTPException(status_code=400, detail='Unsupported provider.')

    system_prompt = payload.system_prompt.strip()
    user_message = payload.message.strip()

    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({'role': 'system', 'content': system_prompt})
    messages.extend(normalize_history_messages(payload.history_messages))
    messages.append({'role': 'user', 'content': user_message})
    responses_input = build_responses_input(messages, payload.attachments)

    try:
        if payload.provider == 'openai':
            if not payload.model:
                raise HTTPException(status_code=400, detail='Model is required for OpenAI.')

            models = provider_cfg.get('models', [])
            model_cfg = next((m for m in models if m.get('id') == payload.model), None)
            if model_cfg and not model_cfg.get('enabled', True):
                raise HTTPException(status_code=400, detail='Model is disabled.')

            api_key = (payload.api_key or '').strip() or os.getenv('OPENAI_API_KEY', '').strip()
            if not api_key:
                raise HTTPException(status_code=500, detail='Missing OPENAI_API_KEY.')

            client = OpenAI(api_key=api_key)
            response = client.responses.create(model=payload.model, input=responses_input)
            model_name = payload.model

        else:
            if not payload.deployment:
                raise HTTPException(status_code=400, detail='Deployment is required for Azure.')

            endpoint = normalize_azure_endpoint(os.getenv('AZURE_OPENAI_ENDPOINT', ''))
            api_key = (payload.api_key or '').strip() or os.getenv('AZURE_OPENAI_API_KEY', '').strip()
            api_version = os.getenv('AZURE_OPENAI_API_VERSION', '2024-10-21').strip()

            if not endpoint or not api_key:
                raise HTTPException(status_code=500, detail='Missing AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY.')

            deployments = provider_cfg.get('deployments', [])
            deployment_cfg = next((d for d in deployments if d.get('name') == payload.deployment), None)
            if not deployment_cfg:
                raise HTTPException(status_code=400, detail='Unknown Azure deployment.')
            if not deployment_cfg.get('enabled', True):
                raise HTTPException(status_code=400, detail='Deployment is disabled.')

            model_name = str(deployment_cfg.get('model', '')).strip() or payload.deployment
            client = AzureOpenAI(api_key=api_key, azure_endpoint=endpoint, api_version=api_version)
            response = client.responses.create(model=payload.deployment, input=responses_input)
    except HTTPException:
        raise
    except Exception as exc:
        error_message = str(exc)
        if 'Resource not found' in error_message:
            raise HTTPException(
                status_code=502,
                detail='Provider call failed: Resource not found. Check AZURE_OPENAI_ENDPOINT (base resource URL only), deployment name, and API version.',
            ) from exc
        raise HTTPException(status_code=502, detail=f'Provider call failed: {error_message}') from exc

    usage = map_usage_from_response(response)
    pricing = get_pricing(provider_cfg, model_name)
    cost = estimate_cost(usage, pricing)
    content = extract_response_text(response)
    responded_at = utc_now_iso()

    return {
        'requested_at': requested_at,
        'responded_at': responded_at,
        'provider': payload.provider,
        'selected': {
            'model': payload.model,
            'deployment': payload.deployment,
            'resolved_model': model_name,
        },
        'llm_messages': messages,
        'llm_response': response.model_dump(),
        'answer': content,
        'usage': usage.model_dump(),
        'cost': cost.model_dump(),
    }


@app.post('/api/snapshots')
def create_snapshot(payload: SnapshotRequest) -> dict[str, str]:
    snapshot_id = str(uuid.uuid4())
    file_path = SNAPSHOTS_DIR / f'{snapshot_id}.json'
    data = {'id': snapshot_id, 'createdAt': utc_now_iso(), 'history': payload.history}
    file_path.write_text(json.dumps(data), encoding='utf-8')
    return {'id': snapshot_id}


@app.get('/api/snapshots/{snapshot_id}')
def get_snapshot(snapshot_id: str) -> dict:
    try:
        uuid.UUID(snapshot_id)
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid snapshot ID.')
    file_path = SNAPSHOTS_DIR / f'{snapshot_id}.json'
    if not file_path.exists():
        raise HTTPException(status_code=404, detail='Snapshot not found.')
    return json.loads(file_path.read_text(encoding='utf-8'))


@app.get('/')
def home() -> FileResponse:
    return FileResponse(STATIC_DIR / 'index.html')
