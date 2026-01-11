import { createFeedSubscriber } from "./feed.js";
import { createSwitchboardTools } from "./tools.js";
import { ClaimStrategy, MastraAgent, runAgentWorker, RoutingPolicy } from "./worker.js";
import type { Event } from "@switchboard/shared";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseLeaseMs(): number {
  const raw = process.env.CLAIM_LEASE_MS;
  if (!raw) return 120_000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
}

const relayUrl = requiredEnv("RELAY_BASE_URL");
const feedId = requiredEnv("FEED_ID");
const agentId = process.env.BRIDGE_AGENT_ID ?? "mastra-bridge";
const routingType = process.env.BRIDGE_ROUTING_TYPE ?? "task";
const leaseMs = parseLeaseMs();

const tools = createSwitchboardTools(relayUrl, feedId, {
  authorIdentityId: agentId,
});
const subscriber = createFeedSubscriber(relayUrl, feedId);

const routing: RoutingPolicy = (event: Event) => event.type === routingType;

const agent: MastraAgent = {
  id: agentId,
  name: "Mastra bridge runtime",
  async handle(event, runnerTools) {
    console.log(
      `[mastra-bridge] handling ${event.type} event ${event.event_id}`
    );

    if (event.type !== "task") return;

    const result = await runnerTools.publishEvent({
      type: "result",
      payload: {
        summary: `Mastra bridge observed task ${event.event_id} with payload ${JSON.stringify(
          event.payload
        )}`,
        original_payload: event.payload,
      },
      refs: { task_event_id: event.event_id },
    });

    console.log(`[mastra-bridge] published result ${result.event_id}`);
  },
};

const claimStrategy: ClaimStrategy = {
  async claim(event, runnerTools) {
    if (event.type !== "task") {
      return true;
    }
    return runnerTools.claimTask({
      taskEventId: event.event_id,
      agentId,
      leaseDurationMs: leaseMs,
    });
  },
};

async function main(): Promise<void> {
  const stop = await runAgentWorker({
    agent,
    tools,
    subscriber,
    routing,
    claimStrategy,
  });

  const cleanup = () => {
    stop();
    process.exit(0);
  };

  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);
}

main().catch((err) => {
  console.error("[mastra-bridge] runtime failed", err);
  process.exit(1);
});

