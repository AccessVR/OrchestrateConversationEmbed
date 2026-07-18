// ES module entry point. The implementation lives in the UMD build (index.js)
// so there is a single source of truth; this re-exports it with named + default
// bindings for bundlers and native ESM consumers.
import pkg from './index.js'

export const attach = pkg.attach
export const ConversationEmbed = pkg.ConversationEmbed
export default pkg
