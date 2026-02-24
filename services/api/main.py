import json
import os
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
STATIC_DIR = BASE_DIR / 'services' / 'website'
load_dotenv(BASE_DIR / '.env')


class ChatRequest(BaseModel):
    provider: str = Field(pattern='^(openai|azure)$')
    model: str | None = None
    deployment: str | None = None
    api_key: str | None = None
    system_prompt: str = Field(default='')
    message: str = Field(min_length=1)
    history_messages: list[dict[str, str]] = Field(default_factory=list)


class UsageDto(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class CostDto(BaseModel):
    input_cost_usd: float = 0.0
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
        return {'input_per_1m_tokens_usd': 0.0, 'output_per_1m_tokens_usd': 0.0}
    return {
        'input_per_1m_tokens_usd': float(pricing.get('input_per_1m_tokens_usd', 0.0)),
        'output_per_1m_tokens_usd': float(pricing.get('output_per_1m_tokens_usd', 0.0)),
    }


def estimate_cost(usage: UsageDto, pricing: dict[str, float]) -> CostDto:
    input_cost = (usage.input_tokens / 1_000_000) * pricing['input_per_1m_tokens_usd']
    output_cost = (usage.output_tokens / 1_000_000) * pricing['output_per_1m_tokens_usd']
    return CostDto(
        input_cost_usd=round(input_cost, 8),
        output_cost_usd=round(output_cost, 8),
        total_cost_usd=round(input_cost + output_cost, 8),
    )


def normalize_text_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get('type') == 'text' and isinstance(item.get('text'), str):
                chunks.append(item['text'])
        return ''.join(chunks)
    return ''


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
            completion = client.chat.completions.create(model=payload.model, messages=messages)
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
            completion = client.chat.completions.create(model=payload.deployment, messages=messages)
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

    usage = UsageDto(
        input_tokens=int(getattr(completion.usage, 'prompt_tokens', 0) or 0),
        output_tokens=int(getattr(completion.usage, 'completion_tokens', 0) or 0),
        total_tokens=int(getattr(completion.usage, 'total_tokens', 0) or 0),
    )

    pricing = get_pricing(provider_cfg, model_name)
    cost = estimate_cost(usage, pricing)
    content = normalize_text_content(getattr(completion.choices[0].message, 'content', ''))

    return {
        'provider': payload.provider,
        'selected': {
            'model': payload.model,
            'deployment': payload.deployment,
            'resolved_model': model_name,
        },
        'llm_messages': messages,
        'llm_response': completion.model_dump(),
        'answer': content,
        'usage': usage.model_dump(),
        'cost': cost.model_dump(),
    }


@app.get('/')
def home() -> FileResponse:
    return FileResponse(STATIC_DIR / 'index.html')
