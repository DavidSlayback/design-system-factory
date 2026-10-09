# Design System Factory

A core design language — W3C DTCG tokens, a small React component kit, Storybook docs — and the pipeline that turns a small config change into a new iteration of that language, without forking components.

## What the factory is

The **core foundation** is shared and never forked:

- **Primitive tokens** — raw, usage-neutral values (color ramps, type scale, spacing, radii, shadows) in W3C DTCG JSON. Never consumed directly by components.
- **Semantic tokens** — role-named mappings (`surface-default`, `content-primary`, `action-primary`, …). The only layer components read, via CSS custom properties.
- **Base components** — a React kit styled entirely from semantic CSS custom properties, so one build renders correctly under every iteration.

An **iteration** is data, not a fork: a named directory of DTCG override files layered over the shared tiers. `dsf iteration new <name>` scaffolds it from core defaults; `pnpm build` compiles one CSS file per iteration while a single component build serves all of them, switching at runtime via a `data-iteration` attribute.

> Status: repo scaffold in progress — the token foundation, component kit, docs app, and CLI land in follow-up tasks.

## Repo layout (planned)

```text
apps/
  storybook/        # Storybook 9 docs: per-iteration pages, token tables, iteration toolbar
packages/
  tokens/           # DTCG source of truth + Style Dictionary build (generated CSS/JSON + manifest)
  react/            # React 19 component kit consuming semantic CSS variables only
  cli/              # `dsf iteration new <name>` — the factory's front door
```

Spec: Blueprint art_oPryY91l (Obvious project).
