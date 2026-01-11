import { randomUUID } from "node:crypto";
import type { Event, Source } from "@switchboard/shared";

function normalizeUrl(relayUrl: string): string {
  return relayUrl.replace(/\/+$/, "");
}

function buildHeaders(authToken?: string): HeadersInit {
  const headers: HeadersInit = {
    "content-type": "application/json",
  };

  if (authToken) {
    headers["authorization"] = `Bearer ${authToken}`;
  }

  return headers;
}

export interface PublishEventInput {
  type: string;
  payload: Record<string, unknown>;
  refs?: Record<string, unknown> | null;
  authorIdentityId?: string;
  source?: Partial<Source>;
}

export interface ClaimTaskInput {
  taskEventId: string;
  agentId: string;
  leaseDurationMs?: number;
  lookback?: number;
}

export interface GetRecentEventsInput {
  limit?: number;
  afterTs?: string;
}

export interface SwitchboardToolsOptions {
  authToken?: string;
  authorIdentityId?: string;
  platform?: string;
  adapterId?: string;
}

export interface SwitchboardTools {
  publishEvent(input: PublishEventInput): Promise<Event>;
  getRecentEvents(options?: GetRecentEventsInput): Promise<Event[]>;
  claimTask(options: ClaimTaskInput): Promise<boolean>;
  readonly relayUrl: string;
  readonly feedId: string;
}

export function createSwitchboardTools(
  relayUrl: string,
  feedId: string,
  options: SwitchboardToolsOptions = {}
): SwitchboardTools {
  const baseUrl = normalizeUrl(relayUrl);
  const headers = buildHeaders(options.authToken);
  const baseSource: Source = {
    platform: options.platform ?? "mastra",
    adapter_id: options.adapterId ?? "mastra-bridge",
    source_msg_id: null,
  };

  const publishEvent = async (input: PublishEventInput): Promise<Event> => {
    const event: Event = {
      event_id: randomUUID(),
      feed_id: feedId,
      type: input.type,
      author_identity_id:
        input.authorIdentityId ??
        options.authorIdentityId ??
        "mastra:bridge",
      source: {
        platform: input.source?.platform ?? baseSource.platform,
        adapter_id: input.source?.adapter_id ?? baseSource.adapter_id,
        source_msg_id:
          input.source?.source_msg_id ?? baseSource.source_msg_id,
      },
      ts: new Date().toISOString(),
      payload: input.payload,
      refs: input.refs ?? undefined,
    };

    const res = await fetch(`${baseUrl}/feeds/${feedId}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      throw new Error(
        `publishEvent failed ${res.status}: ${await res.text()}`
      );
    }

    return (await res.json()) as Event;
  };

  const getRecentEvents = async (params: GetRecentEventsInput = {}) => {
    const url = new URL(`${baseUrl}/feeds/${feedId}/events`);
    if (params.limit !== undefined) {
      url.searchParams.set("limit", String(params.limit));
    }
    if (params.afterTs) {
      url.searchParams.set("after_ts", params.afterTs);
    }

    const res = await fetch(url.toString(), {
      headers,
    });

    if (!res.ok) {
      throw new Error(
        `getRecentEvents failed ${res.status}: ${await res.text()}`
      );
    }

    return (await res.json()) as Event[];
  };

  const claimTask = async ({
    taskEventId,
    agentId,
    leaseDurationMs = 5 * 60 * 1000,
    lookback = 50,
  }: ClaimTaskInput): Promise<boolean> => {
    const events = await getRecentEvents({ limit: lookback });
    const now = Date.now();

    const activeClaim = events
      .filter((evt) => evt.type === "claim")
      .reverse()
      .find((evt) => {
        const payload = evt.payload as Record<string, unknown>;
        const leaseUntil = payload?.lease_until;
        const taskId = payload?.task_event_id;
        if (typeof taskId !== "string" || typeof leaseUntil !== "string") {
          return false;
        }
        const until = Date.parse(leaseUntil);
        return taskId === taskEventId && until > now;
      });

    if (activeClaim) {
      const payload = activeClaim.payload as Record<string, unknown>;
      return payload?.agent_id === agentId;
    }

    const leaseUntil = new Date(now + leaseDurationMs).toISOString();
    await publishEvent({
      type: "claim",
      payload: {
        task_event_id: taskEventId,
        agent_id: agentId,
        lease_until: leaseUntil,
      },
      refs: {
        task_event_id: taskEventId,
      },
    });

    return true;
  };

  const tools: SwitchboardTools = {
    relayUrl: baseUrl,
    feedId,
    publishEvent,
    getRecentEvents,
    claimTask,
  };

  return tools;
}

