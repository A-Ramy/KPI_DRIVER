// No base / assetsPrefix here: Webflow Cloud sets them from the environment's mount path (e.g. /api/booking).
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare({ imageService: "passthrough" })
});
