const express =require('express');
const router = express.Router();
require('dotenv').config();
const axios = require('axios');

router.post('/segments/nlp-parse', async (req, res) => {
  const { prompt } = req.body;

  const systemMessage = `
You are a helpful assistant that turns English segmentation prompts into JSON rules.
Use only these fields: "spend", "visits", "last_shopped".
Operators: ">", "<", "=".
Return this exact JSON array (no prose, no markdown fences):

[
  {
    "field": "spend",
    "operator": ">",
    "value": 5000,
    "logicalOperator": "AND"
  },
  {
    "field": "last_shopped",
    "operator": "<",
    "value": "2024-11-16"
  }
]

If time is mentioned (like "not shopped in 6 months"), return a date 6 months ago from today in YYYY-MM-DD.
Return ONLY valid JSON, no explanations or extra text.
`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 800
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'CRM Segmentation Tool',
        },
      }
    );

    let jsonText = (response.data?.choices?.[0]?.message?.content || '').trim();

    // Strip accidental markdown code fences if present
    if (/^```/.test(jsonText)) {
      jsonText = jsonText
        .replace(/^```json\s*/i, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();
    }

    // Parse result, allow wrapped shapes like { rules: [...] } or { conditions: [...] }
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format returned by AI',
        rawResponse: jsonText
      });
    }

    const conditions = Array.isArray(parsed) ? parsed
                     : Array.isArray(parsed?.rules) ? parsed.rules
                     : Array.isArray(parsed?.conditions) ? parsed.conditions
                     : null;

    if (!conditions) {
      return res.status(400).json({ success: false, message: 'Expected a JSON array of conditions' });
    }

    // Normalize and validate
    const allowedFields = new Set(['spend', 'visits', 'last_shopped']);
    const allowedOps = new Set(['>', '<', '=']);

    const normalized = conditions.map((c, idx) => {
      const field = String(c.field || '').trim();
      const operator = String(c.operator || '').trim();
      const value = c.value;

      if (!allowedFields.has(field)) {
        throw new Error(`Invalid field: ${field}`);
      }
      if (!allowedOps.has(operator)) {
        throw new Error(`Invalid operator: ${operator}`);
      }

      const out = { field, operator, value };
      if (idx > 0) out.logicalOperator = String(c.logicalOperator || 'AND').toUpperCase();
      return out;
    });

    return res.json({ success: true, conditions: normalized });
  } catch (error) {
    const status = error.response?.status;
    const payload = error.response?.data || error.message || error;
    console.error('OpenRouter error:', payload);

    if (status === 404) {
      return res.status(502).json({
        success: false,
        message: 'AI model not available (404). Switch to another available model.'
      });
    }

    if (error.message?.startsWith('Invalid field:') || error.message?.startsWith('Invalid operator:')) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(502).json({ success: false, message: 'AI parsing failed', error: payload });
  }
});

module.exports = router;
