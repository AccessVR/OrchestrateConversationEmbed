/**
 * @orchestratexr/conversation-embed
 * ---------------------------------
 * Embed the OrchestrateXR conversation player in an <iframe> and exchange
 * interaction events with it over postMessage — receive utterances, tool calls,
 * speaking-state and perception events, and send respond / echo / interrupt /
 * context / sensitivity / tool-result commands back into the live conversation.
 *
 * This is the host-side (embedding page) SDK. It mirrors the wire protocol the
 * player implements; there is nothing to configure on the player beyond loading
 * a conversation in an iframe.
 *
 * UMD build: usable as a browser global (`OrchestrateConversationEmbed`), a
 * CommonJS module (`require`), or — via the sibling `index.mjs` — an ES module.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.OrchestrateConversationEmbed = factory()
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  var PLAYER_SOURCE = 'orchestrate-player'
  var HOST_TARGET = 'orchestrate-player'

  function ConversationEmbed(iframe, options) {
    if (!iframe || !iframe.contentWindow) {
      throw new Error('OrchestrateConversationEmbed requires an <iframe> element')
    }
    options = options || {}

    this.iframe = iframe
    // Origin to postMessage TO the player. '*' works but pinning the player's
    // origin (e.g. 'https://app.orchestratexr.com') is recommended in production.
    this.playerOrigin = options.playerOrigin || '*'
    // When set, events NOT from one of these origins are ignored.
    this.allowedOrigins = options.allowedOrigins || null
    this.listeners = {}
    this.ready = false
    this.readyInfo = null

    var self = this
    this._onMessage = function (event) {
      self._handleMessage(event)
    }
    window.addEventListener('message', this._onMessage)
  }

  ConversationEmbed.prototype._handleMessage = function (event) {
    if (event.source !== this.iframe.contentWindow) {
      return
    }
    if (this.allowedOrigins && this.allowedOrigins.indexOf(event.origin) === -1) {
      return
    }
    var msg = event.data && event.data.orchestrate
    if (!msg || msg.source !== PLAYER_SOURCE) {
      return
    }

    if (msg.type === 'ready') {
      this.ready = true
      this.readyInfo = msg
      this._emit('ready', msg)
      return
    }

    if (msg.type === 'interaction-event') {
      // Fire both the catch-all 'interaction' channel and a per-event-type
      // channel keyed off the event_type (e.g. 'utterance', 'tool_call').
      this._emit('interaction', msg.event, msg)
      var shortName = String(msg.event_type || '').replace(/^conversation\./, '')
      if (shortName) {
        this._emit(shortName, msg.event, msg)
      }
      return
    }

    if (msg.type === 'lifecycle') {
      this._emit('lifecycle', msg)
      if (msg.event) {
        this._emit(msg.event, msg)
      }
      return
    }

    if (msg.type === 'error') {
      this._emit('error', msg)
      return
    }
  }

  // ---- Event subscription ---------------------------------------------------

  ConversationEmbed.prototype.on = function (name, handler) {
    ;(this.listeners[name] = this.listeners[name] || []).push(handler)
    return this
  }

  ConversationEmbed.prototype.off = function (name, handler) {
    var list = this.listeners[name]
    if (!list) {
      return this
    }
    this.listeners[name] = list.filter(function (h) {
      return h !== handler
    })
    return this
  }

  ConversationEmbed.prototype._emit = function (name) {
    var list = this.listeners[name]
    if (!list) {
      return
    }
    var args = Array.prototype.slice.call(arguments, 1)
    list.slice().forEach(function (handler) {
      try {
        handler.apply(null, args)
      } catch (err) {
        // A misbehaving host handler must not break the message pump.
        if (typeof console !== 'undefined') {
          console.error('OrchestrateConversationEmbed handler error', err)
        }
      }
    })
  }

  // ---- Host → Player commands ----------------------------------------------

  ConversationEmbed.prototype.send = function (action, fields) {
    var command = { target: HOST_TARGET, action: action }
    if (fields) {
      for (var key in fields) {
        if (Object.prototype.hasOwnProperty.call(fields, key)) {
          command[key] = fields[key]
        }
      }
    }
    this.iframe.contentWindow.postMessage({ orchestrate: command }, this.playerOrigin)
    return this
  }

  /** Ask the player to (re)announce itself. Resolves when 'ready' arrives. */
  ConversationEmbed.prototype.handshake = function () {
    var self = this
    return new Promise(function (resolve) {
      if (self.ready) {
        resolve(self.readyInfo)
        return
      }
      var onReady = function (info) {
        self.off('ready', onReady)
        resolve(info)
      }
      self.on('ready', onReady)
      self.send('handshake')
    })
  }

  ConversationEmbed.prototype.respond = function (text) {
    return this.send('respond', { text: text })
  }

  ConversationEmbed.prototype.echo = function (text, opts) {
    opts = opts || {}
    return this.send('echo', {
      text: text,
      modality: opts.modality,
      audio: opts.audio,
      sample_rate: opts.sampleRate,
      done: opts.done,
      inference_id: opts.inferenceId,
    })
  }

  ConversationEmbed.prototype.interrupt = function () {
    return this.send('interrupt')
  }

  ConversationEmbed.prototype.overwriteContext = function (context) {
    return this.send('overwrite_context', { context: context })
  }

  ConversationEmbed.prototype.appendContext = function (context) {
    return this.send('append_context', { context: context })
  }

  /** Pass { pause: '…' } or { interrupt: '…' } — exactly one. */
  ConversationEmbed.prototype.sensitivity = function (opts) {
    opts = opts || {}
    return this.send('sensitivity', {
      pause_sensitivity: opts.pause,
      interrupt_sensitivity: opts.interrupt,
    })
  }

  ConversationEmbed.prototype.toolResult = function (opts) {
    opts = opts || {}
    return this.send('tool_result', {
      tool_call_id: opts.toolCallId,
      output: opts.output,
      status: opts.status,
    })
  }

  /** Send an arbitrary inbound interaction event by its event_type. */
  ConversationEmbed.prototype.interaction = function (eventType, properties) {
    return this.send('interaction', { event_type: eventType, properties: properties })
  }

  ConversationEmbed.prototype.destroy = function () {
    window.removeEventListener('message', this._onMessage)
    this.listeners = {}
  }

  return {
    attach: function (iframe, options) {
      return new ConversationEmbed(iframe, options)
    },
    ConversationEmbed: ConversationEmbed,
  }
})
