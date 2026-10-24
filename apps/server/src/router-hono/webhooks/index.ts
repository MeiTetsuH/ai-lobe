import { Hono } from 'hono';

import { memoryExtractionWebhook } from './handlers/memoryExtraction';
import { memoryUserMemoryChatTopicCancel } from './handlers/memoryUserMemoryChatTopicCancel';
import { memoryUserMemoryPersonaUpdateWriting } from './handlers/memoryUserMemoryPersonaUpdateWriting';
import { memoryWebhookAuth } from './middlewares/memoryWebhookAuth';

const app = new Hono().basePath('/api/webhooks');

// Memory pipeline webhooks — share the configured static-header guard.
app.post('/memory-extraction', memoryWebhookAuth(), memoryExtractionWebhook);
app.post(
  '/memory-user-memory/persona/update-writing',
  memoryWebhookAuth(),
  memoryUserMemoryPersonaUpdateWriting,
);
app.post(
  '/memory-user-memory/pipelines/extract/chat-topic/cancel',
  memoryWebhookAuth(),
  memoryUserMemoryChatTopicCancel,
);

export default app;
