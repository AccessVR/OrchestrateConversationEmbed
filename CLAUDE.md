# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

`@orchestratexr/conversation-embed` — the **host-side SDK** a partner page uses to
embed the OrchestrateXR conversation player in an `<iframe>` and exchange
**conversation interaction events** with it over `postMessage`. The host can
receive what happens in a live conversation (utterances, tool calls,
speaking-state, perception) and send commands back into it (respond, echo,
interrupt, overwrite/append context, sensitivity, tool results).

There is no server and no player code here — only the browser client that talks
to the already-embedded player. The player stands up its side of the bridge
automatically when it runs inside an iframe.

## Critical rules — do not violate

- **This repository is public. Never name the upstream conversation/video
  provider anywhere** — not in code, comments, docs, types, package metadata,
  commit messages, or keywords. Refer to the protocol generically as
  "conversation interaction events." The event-type strings on the wire
  (`conversation.utterance`, `conversation.tool_call`, …) are ours to pass
  through; the vendor's name is not.
- **Zero runtime dependencies. Keep it that way.** No `dependencies`, no build
  step, no install/lifecycle scripts, no `git`/URL deps. This keeps the package
  clean under npm's install-time security defaults (npm v12: scripts off, git/URL
  deps blocked) and trivially auditable. Adding any of these needs a strong,
  explicit reason.
- **Never add a long-lived npm token** (`NODE_AUTH_TOKEN`, automation/2FA-bypass
  tokens) to the repo, CI, or docs. Publishing uses trusted publishing (OIDC) —
  see Publishing. npm is deprecating those tokens (publishing capability removed
  ~Jan 2027).
- **Bump the version for every release.** A version is immutable on npm; a Release
  at an already-published version is rejected. Follow SemVer.
- **Don't commit or push without explicit user direction.**

## Architecture

Three source files, one implementation:

| File | Role |
| --- | --- |
| `index.js` | **The implementation** — a UMD build usable as a browser global (`OrchestrateConversationEmbed`) or CommonJS `require`. Single source of truth. |
| `index.mjs` | ES-module entry — a thin re-export of `index.js` (named `attach` / `ConversationEmbed` + default). Do not fork logic here. |
| `index.d.ts` | Hand-written TypeScript types. Keep in lockstep with `index.js`. |

`package.json` maps `main`→`index.js` (require/UMD/CDN), `module`→`index.mjs`
(bundlers/ESM), `types`→`index.d.ts`, and `exports` accordingly. The `files`
allowlist controls what ships — update it if you add a shipped file.

When you change the SDK: edit `index.js`, mirror any public surface change in
`index.d.ts` and the README, and confirm `index.mjs` still re-exports what
consumers import.

## The postMessage protocol

All messages are namespaced under an `orchestrate` key.

**Host → player** (what this SDK sends):
```js
{ orchestrate: { target: 'orchestrate-player', action, ...fields } }
```
Actions: `handshake`, `respond`, `echo`, `interrupt`, `overwrite_context`,
`append_context`, `sensitivity`, `tool_result`, and `interaction` (a generic
passthrough carrying `{ event_type, properties }`).

**Player → host** (what this SDK receives):
```js
{ orchestrate: { v, source: 'orchestrate-player', type, ... } }
```
`type` is one of `ready`, `interaction-event` (carries `event_type` + the raw
`event` payload), `lifecycle` (carries an `event` name like `replica-joined` /
`conversation-ended`), or `error`.

**The player side of this protocol lives in the OrchestrateXR web app, not here.**
Any change to the envelope, action set, or message types is a contract change
that must land on both sides in lockstep, kept backward-compatible because
partner pages and player builds update independently.

## Testing

There is no test runner (the SDK is a small, pure transport layer). Verify
changes by resolving the package both ways and dry-running a publish:

```bash
node -e "require('./index.js')"                                  # CJS resolves
node --input-type=module -e "import('./index.mjs').then(()=>0)"  # ESM resolves
npm publish --dry-run                                            # file set + metadata
```

## Publishing (trusted publishing / OIDC)

The npm org `orchestratexr` owns the scope; the package is
`@orchestratexr/conversation-embed`, public. Bootstrap `0.1.0` was published
manually (no provenance). Everything after publishes from CI with **no token**:

- `.github/workflows/publish.yml` runs on a **GitHub Release** (or manual
  dispatch), authenticates via OIDC (`id-token: write`), and runs
  `npm publish --provenance --access public`.
- The repo + workflow are registered as a **trusted publisher** on the npm
  package settings. Don't rename the workflow file without updating that
  registration.

### Cutting a release

```bash
npm version patch          # or minor/major — bumps package.json, commits, tags
git push origin main --follow-tags
```
Then create a GitHub Release for the new tag. The workflow publishes it with
provenance. (Pushing the tag alone does not publish — only a published Release
triggers CI.)

## Repository

- GitHub: `AccessVR/OrchestrateConversationEmbed` (public).
- License: MIT, © AccessVR LLC d/b/a OrchestrateXR.
- For `gh`, pass `--repo AccessVR/OrchestrateConversationEmbed`.
