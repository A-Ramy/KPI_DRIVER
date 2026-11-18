// Runs on the Edge runtime (required by Webflow Cloud for API routes).
export const config = { runtime: "edge" };
export const prerender = false;
export { handle as GET, handle as POST, handle as OPTIONS } from "./_bridge";
