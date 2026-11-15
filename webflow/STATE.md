# Webflow build state (resume notes)
- Site id 68974c57cac027f80fdf883f. Building IN PLACE on the live site's Designer state (owner's choice, no duplicate). Publish to kpidriver.webflow.io only until the owner approves; never to custom domains without explicit go-ahead.
- Approach: site head/footer custom code + one HtmlEmbed per page section (markup from `webflow/pages`). WHTML builder turns `<button>` into links, so interactive markup stays in embeds.
- Existing site head code (Finsweet Attributes + Memberstack) and footer (jQuery counter) must be kept when adding ours.
- Assets uploaded: see `assets.json`.
- Pilot page created: /book-discovery-call, page id 6afa0d6e369e94ec1c852b8a, body element 6afa0d6e369e94ec1c852b93 (currently empty).
- Open: Knowledge Base + Log in pages use Memberstack; owner must decide their fate. Spanish needs the Localization add-on.
