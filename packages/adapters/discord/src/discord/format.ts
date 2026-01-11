import type { TaskEvent } from "../relay/types.js";

export function formatTask(evt: TaskEvent): string {
  const title = evt.payload?.title ?? "(untitled)";
  const details = evt.payload?.details ?? "";
  const id = evt.event_id ?? "";
  return `🧩 **TASK**\n**${title}**\n${details}\n\n_id: ${id}_`;
}

