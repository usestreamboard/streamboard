# Contributing

Thanks for your interest in streamboard.

## Workflow

1. Fork and create a topic branch off `main`.
2. Make your change. Keep PRs focused — one logical change per PR.
3. Run `pnpm install && pnpm -r lint && pnpm -r typecheck && pnpm -r test` before pushing.
4. Open a PR. Describe what you changed and why.

## Code style

- **Lint + format:** [Biome](https://biomejs.dev). Run `pnpm lint:fix` before committing.
- **Package manager:** pnpm only. Don't add `package-lock.json` or `yarn.lock`.
- **Tests:** Vitest for TypeScript, pytest for Python. Colocate tests next to source where practical.
- **No new files unless necessary.** Prefer editing existing modules.

## Repo layout

See the top-level [README](./README.md) for what's in each subdirectory.

## Releases

Maintainers tag releases as `cli-v*`, `sdk-js-v*`, or `sdk-python-v*`. CI handles publishing.

## Reporting bugs

Open a GitHub issue with reproduction steps. For security issues, see [SECURITY.md](./SECURITY.md).
