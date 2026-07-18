// Type definitions for @orchestratexr/conversation-embed

/** A raw interaction event payload (message_type: "conversation"). */
export interface InteractionEvent {
  message_type: 'conversation'
  event_type: string
  conversation_id?: string
  properties?: Record<string, unknown>
  timestamp?: number
  seq?: number
  turn_idx?: number
  inference_id?: string
  [key: string]: unknown
}

/** Envelope metadata delivered alongside each interaction event. */
export interface InteractionMeta {
  v: number
  source: 'orchestrate-player'
  type: 'interaction-event'
  event_type: string
  conversation_id: string | null
  local_conversation_id?: string | number | null
  event: InteractionEvent
}

/** Player readiness announcement. */
export interface ReadyInfo {
  v: number
  source: 'orchestrate-player'
  type: 'ready'
  conversation_id: string | null
  local_conversation_id?: string | number | null
  protocol_version: number
  supported_actions: string[]
  inbound_event_types: string[]
}

/** Player lifecycle signal (e.g. 'replica-joined', 'conversation-ended'). */
export interface LifecycleMessage {
  v: number
  source: 'orchestrate-player'
  type: 'lifecycle'
  event: string
  conversation_id: string | null
  [key: string]: unknown
}

export interface AttachOptions {
  /** Origin to postMessage commands to. Defaults to '*'; pin in production. */
  playerOrigin?: string
  /** If set, only accept player messages from these origins. */
  allowedOrigins?: string[]
}

export interface EchoOptions {
  modality?: 'text' | 'audio'
  audio?: string
  sampleRate?: number
  done?: boolean
  inferenceId?: string
}

export interface SensitivityOptions {
  /** Set exactly one of pause / interrupt. */
  pause?: string
  interrupt?: string
}

export interface ToolResultOptions {
  toolCallId: string
  output?: unknown
  status?: 'success' | 'error'
}

export class ConversationEmbed {
  constructor(iframe: HTMLIFrameElement, options?: AttachOptions)

  readonly ready: boolean
  readonly readyInfo: ReadyInfo | null

  /** Subscribe. Named event channels:
   *  - 'ready'  → (info: ReadyInfo)
   *  - 'interaction' → (event: InteractionEvent, meta: InteractionMeta)  (all events)
   *  - '<eventType>' e.g. 'utterance' | 'tool_call' | 'started_speaking' | … → (event, meta)
   *  - 'lifecycle' → (msg: LifecycleMessage); also '<lifecycle name>' e.g. 'conversation-ended'
   *  - 'error' → (msg)
   */
  on(name: 'ready', handler: (info: ReadyInfo) => void): this
  on(name: 'interaction', handler: (event: InteractionEvent, meta: InteractionMeta) => void): this
  on(name: 'lifecycle', handler: (msg: LifecycleMessage) => void): this
  on(name: string, handler: (...args: any[]) => void): this
  off(name: string, handler: (...args: any[]) => void): this

  /** Send a raw command envelope to the player. */
  send(action: string, fields?: Record<string, unknown>): this
  /** Request a fresh 'ready'; resolves with the ReadyInfo. */
  handshake(): Promise<ReadyInfo>

  respond(text: string): this
  echo(text: string, opts?: EchoOptions): this
  interrupt(): this
  overwriteContext(context: string): this
  appendContext(context: string): this
  sensitivity(opts: SensitivityOptions): this
  toolResult(opts: ToolResultOptions): this
  /** Send an arbitrary inbound interaction event by its event_type. */
  interaction(eventType: string, properties?: Record<string, unknown>): this

  destroy(): void
}

export function attach(iframe: HTMLIFrameElement, options?: AttachOptions): ConversationEmbed

declare const _default: {
  attach: typeof attach
  ConversationEmbed: typeof ConversationEmbed
}
export default _default
