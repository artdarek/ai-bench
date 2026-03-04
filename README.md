# AI Bench

Prosty projekt do testowania promptow i porownywania kosztow dla `Responses API`.

Aktualnie:
- provider: OpenAI i Azure OpenAI,
- model/deployment: skonfigurowane pod rodzine `gpt-5-mini`,
- wejscie: `System Prompt` + `Message` + opcjonalne zalaczniki plikowe (base64 z przegladarki),
- wynik: odpowiedz + usage tokenow + koszt,
- historia prob w `localStorage` + eksport CSV.
- backend korzysta z `responses.create(...)` dla OpenAI i Azure (bez fallbacku do `chat.completions`).

## 1. Setup

```bash
make setup
```

Ustaw klucze w `.env`:
- `OPENAI_API_KEY` dla OpenAI,
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION` dla Azure.

## 2. Konfiguracja modeli i deploymentow

Plik: `config/providers.json`

- `providers.openai.models` - lista modeli,
- `providers.azure.deployments` - lista deploymentow (z mapowaniem na model),
- `pricing` - ceny za 1M tokenow (input/output), uzywane do estymacji kosztu.

## 3. Run local

```bash
make run
```

Aplikacja: `http://127.0.0.1:8000`

## 4. Run docker

```bash
make docker-up
```

Aplikacja: `http://127.0.0.1:40239`

## Uwagi

- Koszt jest estymowany na podstawie `usage` z API i cennika w `config/providers.json`.
- Przy Azure request idzie na `deployment` (nie na `model`).
- Zalaczniki sa czytane lokalnie w przegladarce i wysylane do Responses API:
  - obrazy jako `input_image.image_url` (data URL base64),
  - PDF jako `input_file.file_data`,
  - pliki tekstowe (np. `csv`, `txt`, `json`, `md`, `py`, `js`) jako `input_text` po dekodowaniu base64.
