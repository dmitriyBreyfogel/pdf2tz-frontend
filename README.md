# pdf2tz frontend

Интерфейс сервиса подготовки технического задания на техническое обслуживание медицинского изделия из PDF-инструкции.

## Стек

- React + TypeScript
- Vite
- Нативный адаптивный CSS без UI-библиотек

## Запуск

Требуется Node.js 22 или новее.

```bash
npm install
npm run dev
```

Vite выведет локальный адрес, обычно `http://localhost:5173`.

Для production-сборки:

```bash
npm run build
npm run preview
```

## Интеграция с backend

Скопируйте `.env.example` в `.env` и задайте адрес backend-сервиса:

```bash
VITE_API_BASE_URL=
VITE_BACKEND_PROXY_TARGET=http://localhost:8081
```

Интерфейс запрашивает доступные модели через `GET /api/v1/maintenance/models` и отправляет PDF вместе с выбранной моделью в `POST /api/v1/maintenance/document`. Он разбирает multipart-ответ backend, отдаёт DOCX на скачивание и отображает список расходников.

В production API доступно на том же origin через Nginx reverse proxy, поэтому CORS не требуется. Dockerfile frontend используется общим `docker compose` в основном репозитории.

## Ветки

- `main` — стабильная база;
- `dev` — ветка активной разработки.
