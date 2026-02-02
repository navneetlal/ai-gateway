import { z } from 'zod'

const messageSchema = z
  .object({
    role: z.string(),
    content: z.any(),
  })
  .catchall(z.unknown())

export const chatCompletionsSchema = z
  .object({
    model: z.string(),
    messages: z.array(messageSchema).min(1),
  })
  .catchall(z.unknown())

export const completionsSchema = z
  .object({
    model: z.string(),
    prompt: z.union([z.string(), z.array(z.string()), z.array(z.number())]).optional(),
  })
  .catchall(z.unknown())

export const embeddingsSchema = z
  .object({
    model: z.string(),
    input: z.union([z.string(), z.array(z.string()), z.array(z.number())]),
  })
  .catchall(z.unknown())

export const imageGenerationsSchema = z
  .object({
    prompt: z.string(),
    model: z.string().optional(),
  })
  .catchall(z.unknown())

export const imageEditsSchema = z.object({}).catchall(z.unknown())

export const audioSpeechSchema = z
  .object({
    model: z.string(),
    input: z.string(),
    voice: z.string(),
  })
  .catchall(z.unknown())

export const audioTranscriptionsSchema = z.object({}).catchall(z.unknown())

export const audioTranslationsSchema = z.object({}).catchall(z.unknown())
