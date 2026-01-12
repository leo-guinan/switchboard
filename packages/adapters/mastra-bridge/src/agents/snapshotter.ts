import type { Event } from "@switchboard/shared";
import type { ClaimStrategy, MastraAgent, RoutingPolicy } from "../worker.js";
import type { SwitchboardTools } from "../tools.js";
import type { LogPublisher } from "../logger.js";

export interface SnapshotterOptions {
  agentId: string;
}

export function createSnapshotter(options: SnapshotterOptions, log?: LogPublisher) {
  const agent: MastraAgent = {
    id: options.agentId,
    name: "Mastra Snapshotter",
    async handle(event: Event, tools: SwitchboardTools) {
      const payload = event.payload as Record<string, unknown>;

      await tools.publishEvent({
        type: "snapshot",
        payload: {
          summary: `Snapshot after ${event.type} ${event.event_id}`,
          last_payload: payload,
          agent: options.agentId,
        },
        refs: { source_event_id: event.event_id },
      });

      log?.publish("info", "Snapshot emitted", {
        snapshot_event_id: event.event_id,
        agent: options.agentId,
        source_event_type: event.type,
      });
    },
  };

  const routing: RoutingPolicy = (event) =>
    event.type === "proposal" || event.type === "result";

  const claimStrategy: ClaimStrategy = {
    async claim() {
      return true;
    },
  };

  return { agent, routing, claimStrategy };
}

