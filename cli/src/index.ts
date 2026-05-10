declare const __CLI_VERSION__: string

import { defineCommand, runMain } from "citty"
import { loginCommand, logoutCommand, whoamiCommand } from "./commands/auth"
import { authCommand } from "./commands/auth-flow"
import { captureCommand } from "./commands/capture"
import { cardsCommand } from "./commands/cards"
import { coursesCommand } from "./commands/courses"
import { decksCommand } from "./commands/decks"
import { reviewCommand } from "./commands/review"
import { skillCommand } from "./commands/skill"

const main = defineCommand({
  meta: {
    name: "memcard",
    version: __CLI_VERSION__,
    description: "Agent-optimized CLI for memcard spaced-repetition flashcards",
  },
  subCommands: {
    login: loginCommand,
    logout: logoutCommand,
    whoami: whoamiCommand,
    auth: authCommand,
    skill: skillCommand,
    decks: decksCommand,
    cards: cardsCommand,
    review: reviewCommand,
    courses: coursesCommand,
    capture: captureCommand,
  },
})

runMain(main)
