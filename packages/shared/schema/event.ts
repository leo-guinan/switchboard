import { z } from "zod";

export const SourceSchema = z.object({
  platform: z.string(),
  adapter_id: z.string(),
  source_msg_id: z.string().nullable(),
});

export const EventSchema = z.object({
  event_id: z.string().uuid(),
  feed_id: z.string().uuid(),
  type: z.string(),
  author_identity_id: z.string(),
  source: SourceSchema,
  ts: z.string().datetime(),
  payload: z.object({}).passthrough(),
  refs: z.object({}).passthrough().optional(),
});

export type Event = z.infer<typeof EventSchema>;
export type Source = z.infer<typeof SourceSchema>;
