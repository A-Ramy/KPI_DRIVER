// Turn the website's month request into a safe HighLevel free-slots query (max 31 days, never in the past).
const q = $input.first().json.query || {};
let start = Number(q.start), end = Number(q.end);
let timezone = str(q.timezone, 60) || 'America/New_York';
try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); } catch (e) { timezone = 'America/New_York'; }
if (!isFinite(start) || !isFinite(end)) return [{ json: { ok: false } }];
start = Math.max(start, Date.now());
end = Math.min(end, start + 31 * 86400000);
if (end <= start) return [{ json: { ok: false } }];
return [{ json: { ok: true, calendarId: CALENDAR_ID, start: Math.floor(start), end: Math.floor(end), timezone } }];
