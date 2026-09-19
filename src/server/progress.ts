export function calculateProgress(statuses: string[]) { if (!statuses.length) return 0; return Math.round(statuses.filter((status) => status === 'completed').length / statuses.length * 100); }
