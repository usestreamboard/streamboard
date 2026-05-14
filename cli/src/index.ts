declare const __CLI_VERSION__: string

import { defineCommand, runMain } from "citty"
import { loginCommand, logoutCommand, whoamiCommand } from "./commands/auth"
import { authCommand } from "./commands/auth-flow"
import { captureCommand } from "./commands/capture"
import { skillCommand } from "./commands/skill"
import { streamboardsCommand } from "./commands/streamboards"

const main = defineCommand({
  meta: {
    name: "streamboard",
    version: __CLI_VERSION__,
    description:
      "Agent-optimized CLI for streamboard — generative-UI streamboards",
  },
  subCommands: {
    login: loginCommand,
    logout: logoutCommand,
    whoami: whoamiCommand,
    auth: authCommand,
    skill: skillCommand,
    capture: captureCommand,
    streamboards: streamboardsCommand,
  },
})

runMain(main)
