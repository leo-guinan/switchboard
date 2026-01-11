import type { Event } from "@switchboard/shared";

export type RelayEvent = Event;

export interface DiscordPayload extends Record<string, unknown> {
  text: string;
  discord: {
    channel_id: string | null;
    guild_id: string | null;
    username: string;
    display_name: string;
  };
}

export interface DiscordMessageEvent extends RelayEvent {
  type: "message";
  payload: DiscordPayload;
  refs?: { reply_to?: string };
}

export interface TaskPayload extends Record<string, unknown> {
  title: string;
  details: string;
  acceptance_tests: string[];
}

export interface TaskEvent extends RelayEvent {
  type: "task";
  payload: TaskPayload;
}

