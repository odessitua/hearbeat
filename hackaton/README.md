# Підготовка до Digital Future Hackathon

Робоча папка команди **HearBeat** — голосові чек-іни для сімей на відстані (ніша **Aging & Longevity**).

**Репозиторій:** [github.com/odessitua/hearbeat](https://github.com/odessitua/hearbeat)  
**Демо (GitHub Pages):** [demo-mockup-v2.html](https://odessitua.github.io/hearbeat/hackaton/demo-mockup-v2.html)

**Хакатон:** [Digital Future Hackathon](https://hackathon.lezo.io/) · 11–12 липня 2026 · онлайн, AI-first / no-code

**Стратегія команди:** «повна продуктова модель + мінімальне демо». На сцені — цільовий продукт; на екрані — доказ AI-core за вікенд.

---

## Файли в папці

### Стратегія і виконання

| Файл | Призначення | Коли читати |
|---|---|---|
| [`hearbeat_project-guide.md`](hearbeat_project-guide.md) | **Головний робочий документ на 48 годин.** Тактичний гайд за блоками 0–6 методички: біль, ICP, скоуп, дані, промпти для Lovable/ML, архітектура, пітч, ролі, ризики | Старт хакатону і весь вікенд |
| [`hearbeat_product-vision.md`](hearbeat_product-vision.md) | **Повне продуктове бачення:** проблема, ICP, AI-core, «умний дзвінок», бізнес, roadmap 3–6 міс., відповіді на тестове завдання | До пітчу і для слайдів vision |
| [`hackathon-blocks-reference-guide.md`](hackathon-blocks-reference-guide.md) | **Загальний довідник** по блоках методички та інструментах (не прив'язаний до HearBeat) | Шпаргалка в будь-який момент |

### Пітч і візуали

| Файл | Призначення | Коли читати |
|---|---|---|
| [`hearbeat_pitchdeck-content.md`](hearbeat_pitchdeck-content.md) | **Контент пітчдеку** — 5 слайдів, спікерські нотатки, хронометраж 3 хв, Q&A | Збірка деки і репетиція |
| [`hearbeat_pitchdeck-visuals-and-metrics.md`](hearbeat_pitchdeck-visuals-and-metrics.md) | **Доповнення до пітчдеку:** які 3 візуали на які слайди, блок метрик з джерелами, Kintsugi, чесний доказовий розрив | Збірка слайдів і репетиція Q&A |
| [`hearbeat-visuals.html`](hearbeat-visuals.html) | **Галерея всіх візуалів** — PNG вбудовані в один HTML (офлайн, одне посилання). Планується легка версія без base64 | Швидкий перегляд / вставка в деку |

### Дослідницька база

| Файл | Призначення | Коли читати |
|---|---|---|
| [`hearbeat_ux-research-dossier-v2.md`](hearbeat_ux-research-dossier-v2.md) | **Дослідницьке досьє:** персони, CJM, empathy map, JTBD, конкуренти, метрики, план валідації — з джерелами і плейсхолдерами `[ВІЗУАЛ: …]` | Якщо журі питає «як досліджували»; бекстейдж до пітчу |

### Демо

| Файл | Призначення | Коли читати |
|---|---|---|
| [`demo-mockup-v2.html`](demo-mockup-v2.html) | **Поточне публічне демо** — замкнений сценарій (дзвінок → рушій → dashboard) | Здача хакатону, GitHub Pages |
| [`demo-mockup.html`](demo-mockup.html) | Попередній макет — 3 вкладки (дзвінок, рушій, адмінка) | Архів / порівняння |
| [`hearbeat-engine/`](hearbeat-engine/) | Мінімальний ML API для live-режиму в `demo-mockup-v2.html` | Деплой на Render/Railway |
| [`hearbeat_demo-audit-and-spec.md`](hearbeat_demo-audit-and-spec.md) | **Аудит демо + специфікація правок:** що працює, що коштує балів, золотий шлях, брендинг sea-wave, чек-ліст здачі | Перед переписуванням демо |

---

## З чого почати

```
1. hearbeat_project-guide.md              → що робимо за вікенд і як
2. hearbeat_product-vision.md             → навіщо продукт і куди росте
3. hearbeat_pitchdeck-content.md          → як це розказати журі
4. hearbeat_pitchdeck-visuals-and-metrics → які картинки на слайди + метрики
5. hearbeat_ux-research-dossier-v2.md     → дослідницька глибина (бекстейдж)
6. hearbeat_demo-audit-and-spec.md        → як виправити демо перед здачею
7. hackathon-blocks-reference-guide.md    → шпаргалка по блоку/інструменту
```

**Швидкий орієнтир за ролями:**

| Роль | Перші розділи |
|---|---|
| Product / пітч | `project-guide` блоки 1–2, 6 + `pitchdeck-content` + `pitchdeck-visuals-and-metrics` |
| Design / слайди | `hearbeat-visuals.html` + `pitchdeck-visuals-and-metrics` + `ux-research-dossier-v2` |
| Web / Lovable | `project-guide` блоки 3–5 + `demo-audit-and-spec` → переписати `demo-mockup.html` |
| ML | `project-guide` блок 4.3 + `product-vision` §7–8 |
| Усі | `project-guide` «North-star метрики» і «Критерій успіху MVP» |

---

## HearBeat в одному абзаці

**HearBeat** — сервіс турботливих голосових чек-інів для сімей на відстані. У літнього батька чи матері — простий сценарій «вхідний дзвінок»; після короткої розмови сервер аналізує голос і зміст. Доросла дитина бачить тренд самопочуття і сигнал «сьогодні краще подзвонити самому».

**AI-core (демо):** акустика + персональний baseline → `vitality_score` + семантичне summary.

**Vision (не в демо, але в презентації):** адаптивний «умний дзвінок», family prompt, мікро-утиліти в діалозі.

---

## Зв'язок між документами

```mermaid
flowchart LR
  PG[hearbeat_project-guide.md]
  PV[hearbeat_product-vision.md]
  PD[hearbeat_pitchdeck-content.md]
  PVM[hearbeat_pitchdeck-visuals-and-metrics.md]
  UX[hearbeat_ux-research-dossier-v2.md]
  VIS[hearbeat-visuals.html]
  DEMO[demo-mockup-v2.html]
  AUD[hearbeat_demo-audit-and-spec.md]
  REF[hackathon-blocks-reference-guide.md]

  PV -->|"формулювання, roadmap, бізнес"| PD
  PG -->|"блок 6 → структура слайдів"| PD
  PG -->|"vision vs demo, ICP, скоуп"| PV
  UX -->|"персони, CJM, конкуренти"| PD
  UX -->|"плейсхолдери [ВІЗУАЛ]"| VIS
  PVM -->|"3 візуали на слайди + метрики"| PD
  PVM --> VIS
  AUD -->|"специфікація правок"| DEMO
  PG -->|"блок 5 → демо"| DEMO
  REF -.->|"шпаргалка по блоках 0–6"| PG
```

- **`project-guide`** посилається на **`product-vision`** і **`hackathon-blocks-reference-guide`**
- **`pitchdeck-content`** зібраний з блоку 6 **`project-guide`** і формулювань **`product-vision`**
- **`pitchdeck-visuals-and-metrics`** доповнює **`pitchdeck-content`** візуалами з **`hearbeat-visuals.html`**
- **`ux-research-dossier-v2`** — дослідницька основа під пітч; візуали див. у **`hearbeat-visuals.html`**
- **`demo-audit-and-spec`** описує правки для **`demo-mockup-v2.html`** (і попереднього **`demo-mockup.html`**) перед здачею

---

## Критерій успіху MVP (вікенд)

Один публічний сценарій без пояснень розробника:

```text
Відкрити лінк → відповісти на чек-ін → побачити оновлений dashboard →
зрозуміти, чому система радить «варто подзвонити».
```

**Обов'язкові артефакти здачі:** пітчдек PDF (≤5 слайдів), OnePager JPG 2400×3500, публічне посилання на демо (+ Loom як запасний варіант).

---

## Три шари продукту (не змішувати на пітчі)

| Шар | Що це | Пріоритет на хакатоні |
|---|---|---|
| **1. AI-core** | Акустика + baseline + тренд + сигнал для сім'ї | **Демо** |
| **2. «Умний дзвінок»** | Адаптивна бесіда, family prompt, календар | **Vision / Phase 1.5** |
| **3. Мікро-утиліта в розмові** | Рецепт, порада, тема про онука — всередині чек-іну | **Vision** |

**Формула пітчу:** «Ось як HearBeat виглядає в повноті → ось що ми вже зібрали за вікенд → ось наступні кроки.»

---

## Див. також

- [`../brainstorm/`](../brainstorm/) — ранній брейншторм, ідеї по інших нішах, умови хакатону
- [`../README.md`](../README.md) — огляд усього репозиторію
- [`../HearBeat/`](../HearBeat/) — код і реалізація (якщо є)
