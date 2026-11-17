// Tiny n8n simulator shared by test-n8n.js and review-capture.js: runs Code nodes, evaluates {{ }} expressions,
// follows IF branches and fakes HighLevel's replies. Nothing touches the network.
function evalExpr(str, ctx) {
  if (typeof str !== 'string' || str[0] !== '=') return str;
  const body = str.slice(1);
  const run = code => Function('$json', '$', `return (${code});`)(ctx.$json, ctx.$);
  const whole = body.match(/^\{\{([\s\S]*)\}\}$/);
  if (whole) return run(whole[1]);
  return body.replace(/\{\{([\s\S]*?)\}\}/g, (_, c) => String(run(c)));
}

function runWorkflow(wf, input, hl) {
  const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
  const outputs = {}, calls = [];
  let response = null;
  const $ = name => ({ first: () => ({ json: outputs[name] }) });
  let node = byName['Webhook'], json = input;
  outputs['Webhook'] = json;
  let next = (name, idx = 0) => { const c = (wf.connections[name] || { main: [] }).main[idx] || []; return c[0] && byName[c[0].node]; };
  node = next('Webhook');
  for (let guard = 0; node && guard < 50; guard++) {
    const ctx = { $json: json, $ };
    let branch = 0;
    if (node.type === 'n8n-nodes-base.code') {
      const fn = Function('$input', '$', node.parameters.jsCode);
      const res = fn({ first: () => ({ json }) }, $);
      json = res[0].json;
    } else if (node.type === 'n8n-nodes-base.if') {
      const cond = node.parameters.conditions.conditions[0];
      branch = evalExpr(cond.leftValue, ctx) === true ? 0 : 1;
    } else if (node.type === 'n8n-nodes-base.httpRequest') {
      const p = node.parameters;
      const req = { method: p.method, url: evalExpr(p.url, ctx), headers: Object.fromEntries(p.headerParameters.parameters.map(h => [h.name, h.value])) };
      if (p.sendQuery) req.query = Object.fromEntries(p.queryParameters.parameters.map(q => [q.name, evalExpr(q.value, ctx)]));
      if (p.sendBody) req.body = JSON.parse(evalExpr(p.jsonBody, ctx));
      calls.push(req);
      json = hl(req);
    } else if (node.type === 'n8n-nodes-base.respondToWebhook') {
      response = { status: Number(evalExpr(node.parameters.options.responseCode, ctx)), body: JSON.parse(evalExpr(node.parameters.responseBody, ctx)) };
    }
    outputs[node.name] = json;
    node = next(node.name, branch);
  }
  return { response, calls };
}

const fakeHL = (opts = {}) => req => {
  if (req.url.endsWith('/contacts/upsert')) return opts.upsertFail ? { statusCode: 422, body: { message: 'bad' } } : { statusCode: 201, body: { new: true, contact: { id: 'CONTACT123' } } };
  if (req.url.endsWith('/calendars/events/appointments')) return opts.slotTaken ? { statusCode: 400, body: { message: 'The slot you have selected is no longer available.' } } : { statusCode: 200, body: { id: 'APPT789', startTime: req.body.startTime } };
  if (/\/free-slots$/.test(req.url)) return { statusCode: 200, body: { '2026-11-18': { slots: ['2026-11-18T10:00:00-05:00', 1234] }, traceId: 'x' } };
  return { statusCode: 201, body: {} };
};


module.exports = { evalExpr, runWorkflow, fakeHL };
