// Runs the bridge locally for tests. The token placeholder is replaced by this session's
// network proxy (the real token is never in a file or command). Needs NODE_USE_ENV_PROXY=1.
import worker from './worker.js';
export const env = { HL_TOKEN: 'proxy-injected' };
export const callBridge = (request) => worker.fetch(request, env);
