import { en } from './en';
import { es } from './es';

export type Language = 'en' | 'es';
export type TranslationKey = keyof typeof en;
const dictionaries = { en, es };

export function translator(language: Language) {
  return (key: TranslationKey) => dictionaries[language][key];
}

export function translateStatus(language: Language, status: string) {
  const keys: Record<string, TranslationKey> = { completed: 'completed', in_progress: 'inProgress', waiting_for_client: 'waitingForClient', pending: 'pending', paid: 'paid', overdue: 'overdue', review: 'review', blocked: 'blocked', todo: 'todo', not_started: 'notStarted', active: 'active', draft: 'draft', cancelled: 'cancelled', half_paid: 'halfPaid', onboarding: 'onboarding', planning: 'planning', archived: 'archived' };
  return keys[status] ? dictionaries[language][keys[status]] : status.replaceAll('_', ' ');
}
