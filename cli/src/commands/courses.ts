import { defineCommand } from "citty"
import { requireClient, rpc } from "../lib/auth"
import { output } from "../lib/output"
import { readStdin } from "../lib/stdin"

const ls = defineCommand({
  meta: { name: "ls", description: "List courses" },
  args: {
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.courses.list())
    output(data, args.pretty)
  },
})

const get = defineCommand({
  meta: { name: "get", description: "Get course details and sections" },
  args: {
    slug: { type: "positional", description: "Course slug", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.courses.getBySlug({ slug: args.slug }))
    output(data, args.pretty)
  },
})

const create = defineCommand({
  meta: { name: "create", description: "Create a new course" },
  args: {
    title: { type: "positional", description: "Course title", required: true },
    desc: { type: "string", description: "Description" },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.courses.create({
        title: args.title,
        description: args.desc,
      }),
    )
    output(data, args.pretty)
  },
})

const update = defineCommand({
  meta: { name: "update", description: "Update a course" },
  args: {
    id: { type: "positional", description: "Course ID", required: true },
    title: { type: "string", description: "New title" },
    desc: { type: "string", description: "New description" },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.courses.update({
        id: args.id,
        title: args.title || undefined,
        description: args.desc,
      }),
    )
    output(data, args.pretty)
  },
})

const rm = defineCommand({
  meta: { name: "rm", description: "Delete a course" },
  args: {
    id: { type: "positional", description: "Course ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.courses.remove({ id: args.id }))
    output(data, args.pretty)
  },
})

const createFull = defineCommand({
  meta: {
    name: "create-full",
    description: "Create course with sections and cards from stdin JSON",
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
    const body = await readStdin<{
      title: string
      description?: string
      sections: Array<{
        title: string
        content: string
        cards?: Array<{ front: string; back: string; tags?: string[] }>
      }>
    }>()
    const data = await rpc(() => client.courses.createFull(body))
    output(data, args.pretty)
  },
})

export const coursesCommand = defineCommand({
  meta: { name: "courses", description: "Manage courses" },
  subCommands: { ls, get, create, update, rm, "create-full": createFull },
})
