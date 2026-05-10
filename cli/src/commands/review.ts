import { defineCommand } from "citty"
import { requireClient, rpc } from "../lib/auth"
import { output, outputError } from "../lib/output"

const due = defineCommand({
  meta: { name: "due", description: "Get cards due for review" },
  args: {
    deckId: {
      type: "positional",
      description: "Optional deck ID to scope",
      required: false,
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = args.deckId
      ? await rpc(() =>
          client.review.getDueByDeck({ deckId: args.deckId as string }),
        )
      : await rpc(() => client.review.getDue({}))
    output(data, args.pretty)
  },
})

const submit = defineCommand({
  meta: { name: "submit", description: "Submit a review result" },
  args: {
    cardId: { type: "positional", description: "Card ID", required: true },
    result: { type: "positional", description: "pass or fail", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    if (args.result !== "pass" && args.result !== "fail") {
      return outputError('result must be "pass" or "fail"')
    }
    const client = requireClient()
    const data = await rpc(() =>
      client.review.submit({
        cardId: args.cardId,
        result: args.result as "pass" | "fail",
      }),
    )
    output(data, args.pretty)
  },
})

const reset = defineCommand({
  meta: { name: "reset", description: "Reset a card to box 1" },
  args: {
    cardId: { type: "positional", description: "Card ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.review.reset({ cardId: args.cardId }))
    output(data, args.pretty)
  },
})

export const reviewCommand = defineCommand({
  meta: { name: "review", description: "Review flashcards" },
  subCommands: { due, submit, reset },
})
