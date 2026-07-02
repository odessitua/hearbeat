# EduQuest AI

Рабочий репозиторий для подготовки к [Digital Future Hackathon](https://hackathon.lezo.io/) (11–12 июля 2026).

Название репозитория условное. Текущий фокус — продукт **HearBeat** в нише **Aging & Longevity**: голосовые чек-ины для семей на расстоянии, акустический анализ голоса и dashboard для взрослых детей.

## Контекст хакатона

- **Формат:** онлайн no-code / AI-first хакатон
- **Ниша проекта:** Aging & Longevity
- **Цель:** представить сильную проблему, AI-first решение и публичное демо за один уикенд
- **Критерии:** боль пользователя, AI как ядро, монетизация, питч, рыночный тест после события

Подробные условия и критерии — в [`brainstorm/task.md`](brainstorm/task.md).

## Структура репозитория

### `hackaton/` — подготовка к хакатону

| Файл | Назначение |
|---|---|
| [`hearbeat_project-guide.md`](hackaton/hearbeat_project-guide.md) | **Главный рабочий документ.** Проектный гайд HearBeat по блокам 0–6 методички: боль, скоуп, демо, промпты для Lovable/ML, питч, роли команды |
| [`hackathon-blocks-reference-guide.md`](hackaton/hackathon-blocks-reference-guide.md) | Общий справочник по блокам хакатон-методички и полезным инструментам (не привязан к конкретной фиче) |
| [`pre-hackathon-prep-guide.md`](hackaton/pre-hackathon-prep-guide.md) | Чеклист подготовки до старта: аккаунты, что сгенерировать заранее, роли AI-агентов, план до 11 июля |

### `brainstorm/` — идеи и продуктовое видение

| Файл | Назначение |
|---|---|
| [`hearbeat_product-vision.md`](brainstorm/hearbeat_product-vision.md) | **Полное продуктовое видение HearBeat** (укр.): боль, ICP, пайплайн простыми словами, гибрид Senior Check × CareEcho, roadmap с идеей 13 |
| [`ideas.md`](brainstorm/ideas.md) | Рабочий список продуктовых гипотез по разным нишам, теги, шортлист |
| [`Olya_ideation.md`](brainstorm/Olya_ideation.md) | Краткое описание идеи Senior Check / HearBeat (укр.) |
| [`task.md`](brainstorm/task.md) | Сводка условий хакатона, критериев оценки, тегов и шаблона идеи |
| [`edu-games-gpt5.5.md`](brainstorm/edu-games-gpt5.5.md) | Отдельная ветка идей для обучающих игр (GPT-5.5) |
| [`edu-games-opus4.8.md`](brainstorm/edu-games-opus4.8.md) | Отдельная ветка идей для обучающих игр (Opus 4.8) |

### Корень репозитория

| Файл / папка | Назначение |
|---|---|
| [`senior-check_project-brief.md`](senior-check_project-brief.md) | Ранний тактический бриф Senior Check (48 ч, веб-чек-ин). Частично устарел — заменён расширенным [`hackaton/hearbeat_project-guide.md`](hackaton/hearbeat_project-guide.md) |
| [`.specify/`](.specify/) | **GitHub Spec Kit** — шаблоны, скрипты и workflow для spec-driven development |
| [`.cursor/skills/speckit-*`](.cursor/skills/) | Skills для Cursor Agent: `/speckit-constitution`, `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` и др. |

## Spec Kit (spec-driven development)

В проект добавлен [GitHub Spec Kit](https://github.github.com/spec-kit/) v0.12.4 с интеграцией **Cursor**.

**Типичный workflow в Cursor Agent:**

1. `/speckit-constitution` — зафиксировать принципы проекта (что, зачем, ограничения)
2. `/speckit-specify` — описать фичу: что строим и почему (без выбора стека)
3. `/speckit-plan` — технический план реализации
4. `/speckit-tasks` — разбить план на задачи
5. `/speckit-implement` — выполнить реализацию

Опционально: `/speckit-clarify` (до плана), `/speckit-checklist` и `/speckit-analyze` (после плана/задач).

**Обновление Spec Kit** (нужен [uv](https://docs.astral.sh/uv/)):

```powershell
uvx --from git+https://github.com/github/spec-kit.git@v0.12.4 specify integration upgrade cursor-agent --script ps
```

## Какой документ читать

| Задача | Документ |
|---|---|
| Понять полный продукт и roadmap | [`brainstorm/hearbeat_product-vision.md`](brainstorm/hearbeat_product-vision.md) |
| Готовиться к хакатону, собирать демо | [`hackaton/hearbeat_project-guide.md`](hackaton/hearbeat_project-guide.md) |
| Разобраться в блоках методички | [`hackaton/hackathon-blocks-reference-guide.md`](hackaton/hackathon-blocks-reference-guide.md) |
| Подготовить всё до 11 июля | [`hackaton/pre-hackathon-prep-guide.md`](hackaton/pre-hackathon-prep-guide.md) |
| Сравнить с другими идеями | [`brainstorm/ideas.md`](brainstorm/ideas.md) |
| Начать spec-driven разработку фичи | Spec Kit skills в Cursor: `/speckit-constitution` → `/speckit-specify` → … |

## HearBeat в двух словах

**Проблема:** взрослые дети украинцев за рубежом не могут объективно понять, меняется ли состояние пожилых родителей в Украине — только редкие звонки «на ощупь».

**Решение:** регулярный голосовой чек-ин → акустический анализ относительно персонального baseline → dashboard с трендом и summary для семьи.

**Демо на хакатоне:** эмуляция входящего звонка + живой ML-пайплайн + dashboard. Целевой продукт — исходящий звонок на телефон (Phase 1).

## Текущий этап

Брейншторм завершён, выбрано направление **HearBeat** (Aging & Longevity). Следующий шаг — подготовка к хакатону по [`hackaton/hearbeat_project-guide.md`](hackaton/hearbeat_project-guide.md) и [`hackaton/pre-hackathon-prep-guide.md`](hackaton/pre-hackathon-prep-guide.md).
