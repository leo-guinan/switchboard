import type { Event } from "@switchboard/shared";
import type { ClaimStrategy, MastraAgent, RoutingPolicy } from "../worker.js";
import type { SwitchboardTools } from "../tools.js";
import type { LogPublisher } from "../logger.js";

export interface IntentRouterOptions {
  agentId: string;
  intents: string[];
  defaultIntent: string;
}

const DEFAULT_KEYWORDS: Record<string, string[]> = {
  research: ["research", "find", "look up", "investigate", "analyze"],
  writer: ["draft", "write", "compose", "summary", "outline"],
  qa: ["test", "verify", "check", "qa", "validate"],
};

function detectIntent(text: string, intents: string[], defaultIntent: string) {
  const normalized = text.toLowerCase();
  for (const intent of intents) {
    const keywords = DEFAULT_KEYWORDS[intent] ?? [];
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return intent;
      }
    }
  }
  return defaultIntent;
}

export function createIntentRouter(
  options: IntentRouterOptions,
  log?: LogPublisher
) {
  const agent: MastraAgent = {
    id: options.agentId,
    name: "Intent Routing Agent",
    async handle(event: Event, tools: SwitchboardTools) {
      if (event.type !== "message") return;
      const payload = event.payload as Record<string, unknown>;
      const text = (payload?.text as string | undefined) ?? "";

      if (!text.trim()) return;

      const intent = detectIntent(text, options.intents, options.defaultIntent);
      const title = `Intent assigned: ${intent}`;

      await tools.publishEvent({
        type: "task",
        payload: {
          title,
          details: text,
          intent,
          source_event_id: event.event_id,
        },
        refs: { message_event_id: event.event_id },
      });

      log?.publish("info", "Intent assigned", {
        intent,
        message: text,
        source_event_id: event.event_id,
      });
    },
  };

  const routing: RoutingPolicy = (event) => event.type === "message";

  const claimStrategy: ClaimStrategy = {
    async claim() {
      return true;
    },
  };

  return { agent, routing, claimStrategy };
}

