import type { Event } from "@switchboard/shared";
import type { ClaimStrategy, MastraAgent, RoutingPolicy } from "../worker.js";
import type { SwitchboardTools } from "../tools.js";
import type { LogPublisher } from "../logger.js";

export interface ResearchAgentOptions {
  agentId: string;
  intent?: string;
}

export function createResearchAgent(
  options: ResearchAgentOptions,
  log?: LogPublisher
): {
  agent: MastraAgent;
  routing: RoutingPolicy;
  claimStrategy: ClaimStrategy;
} {
  const intent = options.intent ?? "research";

  const agent: MastraAgent = {
    id: options.agentId,
    name: "Mastra Research Agent",
    async handle(event: Event, tools: SwitchboardTools) {
      if (event.type !== "task") return;

      const context = await tools.getRecentEvents({ limit: 10 });
      const contextSummary = context
        .slice(-5)
        .map((evt) => `${evt.type} ${evt.event_id}`)
        .join(", ");

      const payload = event.payload as Record<string, unknown>;
      const title = payload?.title ?? "Untitled research request";
      const details = payload?.details ?? "";

      const summary = [
        `Research task: ${title}`,
        details,
        contextSummary ? `Context: ${contextSummary}` : undefined,
      ]
        .filter(Boolean)
        .join(" | ");

      await tools.publishEvent({
        type: "result",
        payload: {
          summary,
          agent: options.agentId,
          original_payload: payload,
        },
        refs: { task_event_id: event.event_id },
      });

      log?.publish("info", "Research completed", {
        task_event_id: event.event_id,
        summary,
      });
    },
  };

  const routing: RoutingPolicy = (event) => {
    if (event.type !== "task") return false;
    const payload = event.payload as Record<string, unknown>;
    const taskIntent = payload?.intent;
    return taskIntent === intent;
  };

  const claimStrategy: ClaimStrategy = {
    async claim(event, tools) {
      if (event.type !== "task") return true;
      return tools.claimTask({
        taskEventId: event.event_id,
        agentId: options.agentId,
      });
    },
  };

  return { agent, routing, claimStrategy };
}

