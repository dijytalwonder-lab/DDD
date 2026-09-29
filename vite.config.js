import { defineConfig } from "vite";

// Testing happens on a phone/tablet that reaches a dev server through a
// forwarded hostname rather than localhost. A leading dot matches any
// subdomain so this keeps working when the tunnel name changes.
const FORWARDED_HOSTS = [".app.github.dev", ".githubpreview.dev", ".trycloudflare.com"];

const server = {
    host: true,
    port: 5173,
    allowedHosts: FORWARDED_HOSTS
};

export default defineConfig({
    // Relative base so the built game works when opened from a file path or a
    // subfolder (Capacitor loads dist/ from the app's file system).
    base: "./",
    server,
    preview: { ...server, port: 4173 }
});
