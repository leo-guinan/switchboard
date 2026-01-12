import type { Event } from "@switchboard/shared";
import type { ClaimStrategy, MastraAgent, RoutingPolicy } from "../worker.js";
import type { SwitchboardTools } from "../tools.js";
import type { LogPublisher } from "../logger.js";

export interface WriterAgentOptions {
  agentId: string;
  intent?: string;
}

export function createWriterAgent(options: WriterAgentOptions, log?: LogPublisher) {
  const agent: MastraAgent = {
    id: options.agentId,
    name: "Mastra Writer Agent",
    async handle(event: Event, tools: SwitchboardTools) {
      if (event.type !== "result") return;

      const summary = (event.payload as Record<string, unknown>)?.summary ?? "";

      await tools.publishEvent({
        type: "proposal",
        payload: {
          title: "Draft brief: GitHub repos as coordination contexts",
          body: `Writer ${options.agentId} magicked a brief summarizing: ${summary}`,
          agent: options.agentId,
        },
        refs: { result_event_id: event.event_id },
      });

      log?.publish("info", "Writer created proposal", {
        proposal_event_id: event.event_id,
        writer: options.agentId,
      });
    },
  };

  const routing: RoutingPolicy = (event) => event.type === "result";

  const claimStrategy: ClaimStrategy = {
    async claim() {
      return true;
    },
  };

  return { agent, routing, claimStrategy };
}

