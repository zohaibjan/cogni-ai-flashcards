// ============================================================
// StorageService — AsyncStorage CRUD for study sets
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StudySet } from '../types';

const KEY = '@cogni_study_sets';

export async function getStudySets(): Promise<StudySet[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StudySet[];
  } catch {
    return [];
  }
}

export async function getStudySet(id: string): Promise<StudySet | null> {
  const sets = await getStudySets();
  return sets.find((s) => s.id === id) ?? null;
}

export async function saveStudySet(set: StudySet): Promise<void> {
  const sets = await getStudySets();
  const idx = sets.findIndex((s) => s.id === set.id);
  if (idx >= 0) {
    sets[idx] = set;
  } else {
    sets.unshift(set); // newest first
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(sets));
}

export async function deleteStudySet(id: string): Promise<void> {
  const sets = await getStudySets();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(sets.filter((s) => s.id !== id)),
  );
}

export async function updateLastStudied(id: string): Promise<void> {
  const sets = await getStudySets();
  const set = sets.find((s) => s.id === id);
  if (set) {
    set.lastStudiedAt = new Date().toISOString();
    await AsyncStorage.setItem(KEY, JSON.stringify(sets));
  }
}

/** Generate a simple unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
