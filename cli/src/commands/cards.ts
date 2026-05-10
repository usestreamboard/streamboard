import { defineCommand } from "citty"
import { requireClient, rpc } from "../lib/auth"
import { output } from "../lib/output"
import { readStdin } from "../lib/stdin"

const create = defineCommand({
  meta: { name: "create", description: "Create a single card" },
  args: {
    deckId: { type: "positional", description: "Deck ID", required: true },
    front: { type: "positional", description: "Front text", required: true },
    back: { type: "positional", description: "Back text", required: true },
    tags: { type: "string", description: "Comma-separated tags" },
    source: { type: "string", description: "Source note" },
    type: {
      type: "string",
      description: "Card type: classic or cloze",
      default: "classic",
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.cards.create({
        deckId: args.deckId,
        front: args.front,
        back: args.back,
        cardType: args.type as "classic" | "cloze",
        tags: args.tags ? args.tags.split(",").map((t) => t.trim()) : undefined,
        sourceNote: args.source,
      }),
    )
    output(data, args.pretty)
  },
})

const update = defineCommand({
  meta: { name: "update", description: "Update a card" },
  args: {
    id: { type: "positional", description: "Card ID", required: true },
    front: { type: "string", description: "New front text" },
    back: { type: "string", description: "New back text" },
    tags: { type: "string", description: "New comma-separated tags" },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.cards.update({
        id: args.id,
        front: args.front || undefined,
        back: args.back || undefined,
        tags: args.tags ? args.tags.split(",").map((t) => t.trim()) : undefined,
      }),
    )
    output(data, args.pretty)
  },
})

const rm = defineCommand({
  meta: { name: "rm", description: "Delete a card" },
  args: {
    id: { type: "positional", description: "Card ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.cards.remove({ id: args.id }))
    output(data, args.pretty)
  },
})

const batchCreate = defineCommand({
  meta: {
    name: "batch-create",
    description: "Create multiple cards from stdin JSON",
  },
  args: {
    deckId: { type: "positional", description: "Deck ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const cards =
      await readStdin<
        Array<{
          front: string
          back?: string
          tags?: string[]
          sourceNote?: string
          cardType?: "classic" | "cloze"
        }>
      >()
    const data = await rpc(() =>
      client.cards.batchCreate({ deckId: args.deckId, cards }),
    )
    output(data, args.pretty)
  },
})

const batchUpdate = defineCommand({
  meta: {
    name: "batch-update",
    description: "Update multiple cards from stdin JSON",
  },
  args: {
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const cards =
      await readStdin<
        Array<{ id: string; front?: string; back?: string; tags?: string[] }>
      >()
    const data = await rpc(() => client.cards.batchUpdate({ cards }))
    output(data, args.pretty)
  },
})

export const cardsCommand = defineCommand({
  meta: { name: "cards", description: "Manage flashcards" },
  subCommands: {
    create,
    update,
    rm,
    "batch-create": batchCreate,
    "batch-update": batchUpdate,
  },
})
