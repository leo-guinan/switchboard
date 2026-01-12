import { createFeedSubscriber } from "./feed.js";
import { createSwitchboardTools } from "./tools.js";
import { runAgentWorker } from "./worker.js";
import { createResearchAgent } from "./agents/researcher.js";
import { createIntentRouter } from "./agents/intentRouter.js";
import { createWriterAgent } from "./agents/writer.js";
import { createSnapshotter } from "./agents/snapshotter.js";
import { createLogPublisher } from "./logger.js";

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
const leaseMs = parseLeaseMs();

const tools = createSwitchboardTools(relayUrl, feedId, {});
const subscriber = createFeedSubscriber(relayUrl, feedId);
const logPublisher = createLogPublisher(relayUrl, process.env.LOG_FEED_ID);

const researchAgentId = process.env.RESEARCH_AGENT_ID ?? "mastra-research";
const researchIntent = process.env.RESEARCH_AGENT_INTENT ?? "research";
const writerAgentId = process.env.WRITER_AGENT_ID ?? "mastra-writer";
const snapshotterAgentId =
  process.env.SNAPSHOTTER_AGENT_ID ?? "mastra-snapshotter";

const intentRouterId =
  process.env.INTENT_ROUTING_AGENT_ID ?? "mastra-intent-router";
const intentRoutingIntents = (
  process.env.INTENT_ROUTING_INTENTS ?? "research,writer,qa"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const intentRoutingDefault =
  process.env.INTENT_ROUTING_DEFAULT_INTENT ?? "research";

const research = createResearchAgent(
  {
    agentId: researchAgentId,
    intent: researchIntent,
  },
  logPublisher
);

const writer = createWriterAgent({ agentId: writerAgentId }, logPublisher);
const snapshotter = createSnapshotter(
  { agentId: snapshotterAgentId },
  logPublisher
);
const intentRouter = createIntentRouter(
  {
    agentId: intentRouterId,
    intents: intentRoutingIntents,
    defaultIntent: intentRoutingDefault,
  },
  logPublisher
);

async function main(): Promise<void> {
  logPublisher?.publish("info", "runtime starting", {
    feed_id: feedId,
    intents: intentRoutingIntents,
  });

  const workers = await Promise.all([
    runAgentWorker({
      agent: intentRouter.agent,
      tools,
      subscriber,
      routing: intentRouter.routing,
      claimStrategy: intentRouter.claimStrategy,
    }),
    runAgentWorker({
      agent: research.agent,
      tools,
      subscriber,
      routing: research.routing,
      claimStrategy: research.claimStrategy,
    }),
    runAgentWorker({
      agent: writer.agent,
      tools,
      subscriber,
      routing: writer.routing,
      claimStrategy: writer.claimStrategy,
    }),
    runAgentWorker({
      agent: snapshotter.agent,
      tools,
      subscriber,
      routing: snapshotter.routing,
      claimStrategy: snapshotter.claimStrategy,
    }),
  ]);

  const cleanup = () => {
    workers.forEach((stop) => stop());
    process.exit(0);
  };

  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);
}

main().catch((err) => {
  console.error("[mastra-bridge] runtime failed", err);
  process.exit(1);
});

