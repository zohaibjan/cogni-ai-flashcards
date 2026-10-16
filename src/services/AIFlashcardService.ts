// ============================================================
// AIFlashcardService — Gemini 2.0 Flash flashcard generation
// ============================================================

import { GEMINI_API_KEY } from '../constants';
import type { Flashcard } from '../types';

const MODEL = 'gemini-2.5-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function buildPrompt(title: string, count: number): string {
  return `You are an expert study assistant. Analyze the provided content and generate exactly ${count} high-quality flashcards for effective learning.

Topic: "${title}"

Guidelines:
- Each question tests ONE clear concept
- Answers are concise but complete (1–4 sentences)
- Include "hint" only for genuinely complex concepts (keep it short)
- Cover: key definitions, important facts, relationships, processes, formulas
- Questions must be clear and unambiguous
- Never repeat the same concept twice

Return ONLY a valid JSON array — no markdown, no commentary, no code blocks:
[{"question":"...","answer":"...","hint":"..."}]`;
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(parts: GeminiPart[], title: string, cardCount = 15): Promise<Flashcard[]> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API key missing. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env.local file.',
    );
  }

  const body = {
    contents: [
      {
        parts: [{ text: buildPrompt(title, cardCount) }, ...parts],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg = `Gemini API error (${res.status})`;
    try {
      const err = await res.json();
      errMsg = err?.error?.message ?? errMsg;
    } catch {
      // keep default message
    }
    throw new Error(errMsg);
  }

  const data = await res.json();
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

  // Strip markdown code fences if present
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed: Array<{ question: string; answer: string; hint?: string }> =
    JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('No flashcards could be generated from this content.');
  }

  return parsed.map((c) => ({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    question: c.question?.trim() ?? '',
    answer: c.answer?.trim() ?? '',
    hint: c.hint?.trim() || undefined,
  }));
}

/** Generate flashcards from plain text (typed or extracted) */
export async function generateFromText(
  text: string,
  title: string,
  cardCount = 15,
): Promise<Flashcard[]> {
  if (!text.trim()) throw new Error('No text content provided.');
  return callGemini([{ text }], title, cardCount);
}

/** Generate flashcards from a captured photo or picked image (base64) */
export async function generateFromImage(
  base64: string,
  mimeType: string,
  title: string,
  cardCount = 15,
): Promise<Flashcard[]> {
  return callGemini(
    [{ inline_data: { mime_type: mimeType, data: base64 } }],
    title,
    cardCount,
  );
}

/** Generate flashcards from a PDF or document file (base64) */
export async function generateFromFile(
  base64: string,
  mimeType: string,
  title: string,
  cardCount = 15,
): Promise<Flashcard[]> {
  return callGemini(
    [{ inline_data: { mime_type: mimeType, data: base64 } }],
    title,
    cardCount,
  );
}
