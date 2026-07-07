require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ти — аналізатор мовленнєвих патернів для системи моніторингу самопочуття літніх людей.
Тобі буде надано транскрипт голосової розмови з літньою людиною, її поточні мовленнєві метрики, базові метрики та процентні відхилення між ними.

Поверни ТІЛЬКИ валідний JSON-об'єкт з такими полями (без markdown, без code fences, без преамбули):
{
  "concernLevel": "normal" | "mild" | "notable",
  "summaryForFamily": "2-3 речення зрозумілою мовою для члена сім'ї",
  "observedPatterns": ["масив коротких описових рядків"],
  "disclaimer": "HearBeat відстежує мовленнєві патерни, а не стан здоров'я. Це не медичний діагноз."
}

Правила:
- Посилайся лише на метрики, які явно вказані в запиті. Не вигадуй і не виводь невказані сигнали.
- Використовуй описову мову на рівні патернів (наприклад, "повільніше мовлення, ніж зазвичай"). Ніколи не використовуй клінічні терміни: депресія, деменція, тривожний розлад або будь-який медичний діагноз.
- Визначай concernLevel за розміром дельт: зміна <15% → normal, 15-35% → mild, >35% або декілька метрик → notable.
- observedPatterns: вказуй лише патерни, підкріплені даними, від 1 до 4 пунктів.
- Пиши summaryForFamily та observedPatterns українською мовою.`;

function stripCodeFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

app.post('/api/analyze', async (req, res) => {
  const { transcript, currentMetrics, baselineMetrics, deltas } = req.body;

  if (!transcript || !currentMetrics || !baselineMetrics || !deltas) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const userMessage = `Транскрипт розмови:
${transcript}

Поточні метрики:
- Швидкість мовлення: ${currentMetrics.speechRate?.toFixed(2)} слів/хв
- Коефіцієнт пауз: ${(currentMetrics.pauseRatio * 100)?.toFixed(1)}%
- Середня затримка відповіді: ${currentMetrics.avgLatencyMs?.toFixed(0)} мс
- Середня висота голосу (F0): ${currentMetrics.pitchMeanHz?.toFixed(1)} Гц
- Варіація висоти голосу: ${currentMetrics.pitchVarianceHz?.toFixed(1)} Гц

Базові метрики (калібрування):
- Швидкість мовлення: ${baselineMetrics.speechRate?.toFixed(2)} слів/хв
- Коефіцієнт пауз: ${(baselineMetrics.pauseRatio * 100)?.toFixed(1)}%
- Середня затримка відповіді: ${baselineMetrics.avgLatencyMs?.toFixed(0)} мс
- Середня висота голосу (F0): ${baselineMetrics.pitchMeanHz?.toFixed(1)} Гц
- Варіація висоти голосу: ${baselineMetrics.pitchVarianceHz?.toFixed(1)} Гц

Відхилення від базових метрик:
- Швидкість мовлення: ${deltas.speechRatePct?.toFixed(1)}%
- Коефіцієнт пауз: ${deltas.pauseRatioPct?.toFixed(1)}%
- Затримка відповіді: ${deltas.latencyPct?.toFixed(1)}%
- Середня висота голосу: ${deltas.pitchMeanPct?.toFixed(1)}%
- Варіація висоти голосу: ${deltas.pitchVariancePct?.toFixed(1)}%`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = message.content[0].text;
    const cleaned = stripCodeFences(rawText);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Invalid JSON from model', raw: cleaned });
    }

    res.json(parsed);
  } catch (err) {
    console.error('Anthropic API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`HearBeat server running at http://localhost:${port}`);
});
