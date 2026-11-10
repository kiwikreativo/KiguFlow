const labels: Record<string, string> = {
  draft: "Draft",
  onboarding: "Onboarding",
  planning: "Planning",
  in_progress: "In progress",
  waiting_for_client: "Waiting for client",
  review: "In review",
  completed: "Completed",
  archived: "Archived",
};

export function projectStatusLabel(status: string) {
  return labels[status] ?? status.replaceAll("_", " ");
}
