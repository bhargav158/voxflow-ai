/**
 * VoxFlow — Backend API Server
 * Express server with orchestrator-powered endpoints.
 *
 * Routes:
 *   POST /api/chat           → Main conversation endpoint (orchestrator pipeline)
 *   POST /api/action/confirm → Confirm a pending action
 *   POST /api/action/cancel  → Cancel a pending action
 *   GET  /api/health         → Health check
 */

import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config({ path: "./.env" });

console.log("✅ Loaded API KEY:", process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
import express from 'express';
import cors from 'cors';
import { initQdrant, isQdrantReady, getRetrievalHealth } from './retriever.js';
import {
  getSession,
  confirmPendingAction,
  cancelPendingAction,
} from './sessionStore.js';
import { executeConfirmedAction } from './actionExecutor.js';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// ── Load .env if available ──

// ── Initialize services on startup ──

await initQdrant();

async function getGeminiResponse(userText) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are an AI assistant.

If the user asks to perform an action, respond ONLY in JSON format like this:

[
  {
    "type": "EMAIL",
    "to": "example@gmail.com",
    "message": "Hello..."
  }
]

If no action is needed, respond like:
{
  "type": "NONE",
  "message": "your answer"
}

User input: ${userText}
`;
const prompt = `
You are an AI assistant.

If the user asks to perform an action, respond ONLY in JSON.

Examples:

Reminder:
{
  "type": "REMINDER",
  "message": "Call John",
  "time": "2026-04-25T18:00:00"
}

Email:
{
  "type": "EMAIL",
  "to": "example@gmail.com",
  "message": "Hello..."
}

If no action:
{
  "type": "NONE",
  "message": "your answer"
}

User input: ${userText}
`;
const result = await model.generateContent(prompt);
  const response = await result.response;

  return response.text();
}

// ══════════════════════════════════════════════════════════════
// ── POST /api/chat — Main Conversation Endpoint ─────────────
// ══════════════════════════════════════════════════════════════

app.post("/api/chat", async (req, res) => {
  console.log("🔥 GEMINI ROUTE HIT");
  try {
    const { message } = req.body;

    console.log("User:", message);

    const generatedText = await getGeminiResponse(message);

    console.log("AI:", generatedText);

    let finalReply;

    try {
      const parsed = JSON.parse(generatedText);

      if (parsed.type === "NONE") {
        finalReply = parsed.message;
      } else {
        finalReply = JSON.stringify(parsed);
      }
    } catch {
      finalReply = generatedText;
    }

    res.json({
      reply: finalReply
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      reply: "Error getting AI response"
    });
  }
});

// ══════════════════════════════════════════════════════════════
// ── POST /api/action/confirm — Confirm a Pending Action ─────
// ══════════════════════════════════════════════════════════════

app.post('/api/action/confirm', (req, res) => {
  try {
    const { actionId, sessionId } = req.body;

    if (!actionId || !sessionId) {
      return res.status(400).json({ error: 'Missing actionId or sessionId.' });
    }

    const session = getSession(sessionId);
    const action = confirmPendingAction(session, actionId);

    if (!action) {
      return res.status(404).json({ error: 'Action not found or already processed.' });
    }

    // Execute the confirmed action
    const result = executeConfirmedAction(action);

    console.log(`[VoxFlow] ✅ Action confirmed: ${action.type} (${actionId})`);

    res.json({
      status: 'confirmed',
      action: {
        id: actionId,
        type: action.type,
        icon: action.icon,
      },
      result,
    });
  } catch (err) {
    console.error('[VoxFlow] Action confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm action.' });
  }
});


// ══════════════════════════════════════════════════════════════
// ── POST /api/action/cancel — Cancel a Pending Action ───────
// ══════════════════════════════════════════════════════════════

app.post('/api/action/cancel', (req, res) => {
  try {
    const { actionId, sessionId } = req.body;

    if (!actionId || !sessionId) {
      return res.status(400).json({ error: 'Missing actionId or sessionId.' });
    }

    const session = getSession(sessionId);
    const action = cancelPendingAction(session, actionId);

    if (!action) {
      return res.status(404).json({ error: 'Action not found or already processed.' });
    }

    console.log(`[VoxFlow] ❌ Action cancelled: ${action.type} (${actionId})`);

    res.json({
      status: 'cancelled',
      action: {
        id: actionId,
        type: action.type,
      },
    });
  } catch (err) {
    console.error('[VoxFlow] Action cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel action.' });
  }
});


// ══════════════════════════════════════════════════════════════
// ── GET /api/config — Public Config for Frontend ────────────
// ══════════════════════════════════════════════════════════════

app.get('/api/config', (req, res) => {
  res.json({
    vapi: {
      publicKey: process.env.VAPI_PUBLIC_KEY || '',
      assistantId: process.env.VAPI_ASSISTANT_ID || '',
      enabled: !!(process.env.VAPI_PUBLIC_KEY && process.env.VAPI_ASSISTANT_ID),
    },
  });
});


// ══════════════════════════════════════════════════════════════
// ── GET /api/health — Health Check ──────────────────────────
// ══════════════════════════════════════════════════════════════

app.get('/api/health', async (req, res) => {
  const retrieval = await getRetrievalHealth();

  res.json({
    status: 'ok',
    service: 'VoxFlow Orchestrator API',
    version: '3.1.0',
    architecture: 'Orchestrator Pipeline',
    tools: ['retrieval', 'api', 'reasoning'],
    llmAvailable: true,
    qdrantReady: isQdrantReady(),
    retrieval,
    vapiEnabled: !!(process.env.VAPI_PUBLIC_KEY && process.env.VAPI_ASSISTANT_ID),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health/retrieval', async (req, res) => {
  try {
    const retrieval = await getRetrievalHealth();
    res.json({
      status: 'ok',
      retrieval,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err?.message || 'Failed to inspect retrieval health',
    });
  }
});


// ── Start ──
app.listen(PORT, () => {
  const vapiStatus = process.env.VAPI_PUBLIC_KEY ? '✅ Vapi Voice' : '⚠️ Vapi not configured (browser fallback)';
  const qdrantStatus = isQdrantReady() ? '✅ Python Qdrant backend' : '⚠️ Qdrant not available (in-memory fallback)';

  console.log(`🔥 GEMINI SERVER running on http://localhost:${PORT}`);
  console.log(`[VoxFlow] 🎙️  Voice: ${vapiStatus}`);
  console.log(`[VoxFlow] 🔍 Search: ${qdrantStatus}`);
});
