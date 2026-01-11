import type { Event } from "@switchboard/shared";
import type { FeedSubscriber } from "./feed.js";
import type { SwitchboardTools } from "./tools.js";

export type RoutingPolicy = (event: Event) => boolean;

export interface MastraAgent {
  id: string;
  name: string;
  handle(event: Event, tools: SwitchboardTools): Promise<void>;
}

export interface ClaimStrategy {
  claim(event: Event, tools: SwitchboardTools): Promise<boolean>;
}

export interface AgentWorkerOptions {
  agent: MastraAgent;
  tools: SwitchboardTools;
  subscriber: FeedSubscriber;
  routing: RoutingPolicy;
  claimStrategy?: ClaimStrategy;
}

export async function runAgentWorker(options: AgentWorkerOptions) {
  const stopFn = await options.subscriber.subscribe(async (event: Event) => {
    if (!options.routing(event)) return;

    if (options.claimStrategy) {
      const claimed = await options.claimStrategy.claim(event, options.tools);
      if (!claimed) {
        return;
      }
    }

    try {
      await options.agent.handle(event, options.tools);
    } catch (err) {
      console.error(
        `[mastra-bridge] agent ${options.agent.id} failed to handle event`,
        err
      );
    }
  });

  return stopFn;
}

