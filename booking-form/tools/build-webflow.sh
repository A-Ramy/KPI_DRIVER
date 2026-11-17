#!/usr/bin/env bash
# Build the two Webflow paste-ins from kd-booking.css / kd-booking.js (minified with esbuild).
#   ESBUILD=/path/to/esbuild bash booking-form/tools/build-webflow.sh
# Output:
#   booking-form/webflow/embed-1-styles.html  → Code Embed 1 in the site-wide footer component
#   booking-form/webflow/embed-2-script.html  → Code Embed 2 right after it (settings + script)
set -euo pipefail
cd "$(dirname "$0")/.."
ESBUILD="${ESBUILD:-npx --yes esbuild@0.24.0}"
mkdir -p webflow
css=$($ESBUILD kd-booking.css --minify --log-level=warning)
js=$($ESBUILD kd-booking.js --minify --target=es2019 --log-level=warning)
printf '<!-- KPI DRIVER booking + contact forms: styles -->\n<style>%s</style>\n' "$css" > webflow/embed-1-styles.html
cat > webflow/embed-2-script.html <<EOF
<!-- KPI DRIVER booking + contact forms. Set the three n8n webhook URLs, then mock:false. -->
<script>
window.KD_BOOKING_CONFIG = {
  mock: true,
  slotsUrl: "https://YOUR-N8N-HOST/webhook/kd-booking-slots",
  bookUrl: "https://YOUR-N8N-HOST/webhook/kd-booking-create",
  contactUrl: "https://YOUR-N8N-HOST/webhook/kd-contact"
};
</script>
<script>${js}</script>
EOF
wc -c webflow/embed-1-styles.html webflow/embed-2-script.html
