# @orchestratexr/conversation-embed

Host-side SDK for embedding the [OrchestrateXR](https://orchestratexr.com) conversation player in an `<iframe>` and exchanging conversation interaction events with it over `postMessage`.

Your page can **receive** what happens in a live conversation — utterances, tool calls, speaking-state changes, perception events — and **send** commands back into it: respond, echo, interrupt, overwrite/append context, adjust sensitivity, and return tool results.

There is nothing to install on the player side. When the OrchestrateXR player runs inside an iframe it stands up a bridge automatically; this SDK is the matching host-side client.

## Install

```bash
npm install @orchestratexr/conversation-embed
```

Or drop it on a page directly:

```html
<script src="https://unpkg.com/@orchestratexr/conversation-embed"></script>
<!-- exposes the global OrchestrateConversationEmbed -->
```

## Quick start

```html
<iframe
  id="player"
  src="https://app.orchestratexr.com/…your conversation launch url…"
  allow="camera; microphone; autoplay"
></iframe>

<script type="module">
  import { attach } from '@orchestratexr/conversation-embed'

  const embed = attach(document.getElementById('player'), {
    // Recommended in production: pin the player's origin instead of '*'.
    playerOrigin: 'https://app.orchestratexr.com',
  })

  // The player announces itself once it's live in the iframe.
  embed.on('ready', (info) => {
    console.log('connected to conversation', info.conversation_id)
  })

  // Receive everything the conversation emits.
  embed.on('utterance', (event) => {
    console.log(event.properties.role, event.properties) // full turn text
  })

  // Run a tool the character asked for, then return the result.
  embed.on('tool_call', (event) => {
    const { tool_call_id, name, arguments: args } = event.properties
    const output = runYourTool(name, args)
    embed.toolResult({ toolCallId: tool_call_id, output })
  })

  // Drive the conversation from your UI.
  embed.respond('Tell me about the evacuation route.')
  embed.echo('One moment while I look that up…')
  embed.interrupt()
</script>
```

## Receiving events

`on(name, handler)` subscribes to a channel. There are three kinds:

| Channel | Fires for | Handler args |
| --- | --- | --- |
| `ready` | Player connected (and on every `handshake()`) | `(info)` |
| `interaction` | **Every** interaction event | `(event, meta)` |
| `<eventType>` | One event type, e.g. `utterance`, `utterance.streaming`, `tool_call`, `started_speaking`, `stopped_speaking`, `perception_tool_call`, `perception_analysis` | `(event, meta)` |
| `lifecycle` | Player lifecycle | `(msg)` |
| `<lifecycle name>` | e.g. `replica-joined`, `conversation-ended` | `(msg)` |
| `error` | A command was rejected | `(msg)` |

`event` is the raw interaction-event payload (`{ message_type, event_type, conversation_id, properties, … }`). The per-type channel name is the event type with the `conversation.` prefix stripped.

## Sending events

| Method | Sends |
| --- | --- |
| `respond(text)` | `conversation.respond` — feed text as if the user spoke it |
| `echo(text, opts?)` | `conversation.echo` — make the character speak this verbatim |
| `interrupt()` | `conversation.interrupt` — stop the character talking |
| `overwriteContext(context)` | `conversation.overwrite_llm_context` |
| `appendContext(context)` | `conversation.append_llm_context` |
| `sensitivity({ pause })` / `sensitivity({ interrupt })` | `conversation.sensitivity` (send exactly one) |
| `toolResult({ toolCallId, output, status? })` | `conversation.tool_result` |
| `interaction(eventType, properties?)` | any inbound interaction event, by type |
| `handshake()` | re-request `ready`; returns a `Promise<ReadyInfo>` |

## Security

- **`playerOrigin`** — the origin commands are posted to. Defaults to `'*'`; set it to the player's origin in production so commands can't be delivered to an unexpected document.
- **`allowedOrigins`** — an optional allowlist; when set, events from any other origin are ignored.
- The SDK only accepts messages from the iframe you attached to, so unrelated frames on your page can't spoof the player.

## License

MIT © AccessVR LLC d/b/a OrchestrateXR
