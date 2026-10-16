# Cogni AI Flashcards

An Expo and React Native study-app prototype with AI-generated flashcards, locally stored study sets and an interactive study interface.

## What to explore

- Expo Router navigation and reusable React Native components.
- Flashcard generation from text, photos and document files.
- Gemini response parsing into a typed flashcard model.
- Local storage for study sets and progress.
- A separate, older Supabase backend implementation retained under `supabase/` for reference.

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run start
```

Set `EXPO_PUBLIC_GEMINI_API_KEY` in your local environment to try generation. No real API key, backend account or store signing credentials are supplied.

## Data flow and current limitations

Study sets are stored on the device. Generating cards sends the selected text, image or file content to Google's Gemini API; generation is not fully offline. Use synthetic study materials when evaluating the prototype.

The current mobile client calls Gemini directly. Values prefixed `EXPO_PUBLIC_` are bundled into the client and are accessible to users. This prototype pattern is suitable only for controlled local evaluation with your own restricted test key. A distributed production app should call an authenticated backend that holds the provider key, enforces quotas and validates inputs.

Generated content needs review. The UI and AI workflow are prototypes, with no claim of validated learning outcomes or production security.

## Code map

| Path | Purpose |
|---|---|
| `app/` | Router screens, study generation, library and study session |
| `src/components/` | Flashcard and shared UI components |
| `src/services/AIFlashcardService.ts` | Current Gemini integration |
| `src/services/StorageService.ts` | Local study-set persistence |
| `supabase/` | Earlier backend and subscription experiments |

## Checks

```bash
npx tsc --noEmit
npm test -- --runInBand
```

The repository contains a small component test; this is not an end-to-end validation of the app or AI output.

## Public release

This repository starts from a reviewed source snapshot. Earlier development history and generated build artifacts are retained privately. EAS builds require linking your own Expo project and configuring your own signing credentials.
