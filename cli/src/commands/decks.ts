import { defineCommand } from "citty"
import { requireClient, rpc } from "../lib/auth"
import { output } from "../lib/output"

const ls = defineCommand({
  meta: { name: "ls", description: "List decks with card and due counts" },
  args: {
    folder: {
      type: "string",
      description: "Filter: 'all' (default), 'none', or folder ID",
      default: "all",
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.decks.list({ folder: args.folder }))
    output(data, args.pretty)
  },
})

const get = defineCommand({
  meta: { name: "get", description: "Get deck details and cards" },
  args: {
    slug: { type: "positional", description: "Deck slug", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.decks.getBySlug({ slug: args.slug }))
    output(data, args.pretty)
  },
})

const create = defineCommand({
  meta: { name: "create", description: "Create a new deck" },
  args: {
    title: { type: "positional", description: "Deck title", required: true },
    desc: { type: "string", description: "Description" },
    folder: { type: "string", description: "Folder ID" },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.decks.create({
        title: args.title,
        description: args.desc,
        folderId: args.folder,
      }),
    )
    output(data, args.pretty)
  },
})

const update = defineCommand({
  meta: { name: "update", description: "Update a deck" },
  args: {
    id: { type: "positional", description: "Deck ID", required: true },
    title: { type: "string", description: "New title" },
    desc: { type: "string", description: "New description" },
    folder: { type: "string", description: "Folder ID (use 'none' to remove)" },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.decks.update({
        id: args.id,
        title: args.title,
        description: args.desc,
        folderId: args.folder === "none" ? null : args.folder,
      }),
    )
    output(data, args.pretty)
  },
})

const rm = defineCommand({
  meta: { name: "rm", description: "Delete a deck" },
  args: {
    id: { type: "positional", description: "Deck ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.decks.remove({ id: args.id }))
    output(data, args.pretty)
  },
})

export const decksCommand = defineCommand({
  meta: { name: "decks", description: "Manage flashcard decks" },
  subCommands: { ls, get, create, update, rm },
})
