# HearBeat Engine (демо-зріз)

Мінімальний однофайловий акустичний API для блоку «Свій бейзлайн / Перевірка»
в `hackaton/demo-mockup-v2.html`. Вирізано з `HearBeat/ml` — без Supabase, без
LLM-summary, без експорту time-series. Лише: запис → витяг акустичних ознак
→ порівняння з персональним бейзлайном → `acoustic_index`.

## Локальний запуск

```powershell
cd hackaton/hearbeat-engine
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Перевірка: http://localhost:8000/health

## API

### `POST /analyze`

`multipart/form-data`:

| Поле | Обов'язкове | Опис |
|------|-------------|------|
| `audio_file` | так | Записаний аудіоблоб (webm/wav) |
| `baseline_features` | ні | JSON-рядок `{tempo_bpm, pause_mean_ms, pitch_std_hz, energy_rms}` |

Відповідь:

```json
{
  "features_json": { "tempo_bpm": 93.1, "pause_mean_ms": 310.2, "pitch_std_hz": 225.0, "energy_rms": 0.026, "duration_sec": 4.2 },
  "acoustic_index": 100.0,
  "metric_deviations": {},
  "status": "normal",
  "acoustic_delta": "...",
  "baseline_calibrated": false
}
```

Якщо `baseline_features` не передано — клієнт зберігає повернений `features_json`
як новий бейзлайн (`acoustic_index` у цьому випадку завжди 100).

## Деплой (Railway / Render)

Спочатку код має опинитися в Git, підключеному до платформи. Два варіанти:

### Варіант A — з цього репозиторію (monorepo)

1. Закомітьте й запуште `hackaton/hearbeat-engine/` на GitHub (разом із
   рештою [hearbeat](https://github.com/odessitua/hearbeat)).
2. На [Railway](https://railway.app) або [Render](https://render.com): **New
   Web Service** → підключіть репозиторій `odessitua/hearbeat`.
3. **Root directory** (Render: *Root Directory*; Railway: *Settings → Root
   Directory*): `hackaton/hearbeat-engine` — платформа збиратиме лише цю папку,
   а не весь репозиторій.

### Варіант B — окремий міні-репозиторій (простіше для демо)

1. Скопіюйте папку `hackaton/hearbeat-engine` куди завгодно (або створіть
   новий репозиторій лише з трьома файлами: `app.py`, `requirements.txt`, цей
   `README.md`).
2. Запуште на GitHub.
3. **New Web Service** → підключіть цей репозиторій. Root directory залиште
   порожнім (корінь репо = корінь сервісу).

### Збірка й запуск (обидва варіанти)

4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn app:app --host 0.0.0.0 --port $PORT`
6. Env (опційно): `CORS_ORIGINS=https://odessitua.github.io` — origin GitHub Pages
   (через кому, якщо кілька: Vercel, локальний preview тощо).

Після деплою скопіюйте публічний URL сервісу (наприклад
`https://hearbeat-engine.onrender.com`) у `demo-mockup-v2.html`:

```js
const ENGINE_URL = 'https://hearbeat-engine.onrender.com';
```

На сторінці демки впишіть цей URL у `ENGINE_URL` — live-режим увімкнеться автоматично
(без тумблера). Поки URL = placeholder, працює тиха симуляція з банером.
Перевірка: `https://<ваш-url>/health` → `{"status":"ok"}`.
