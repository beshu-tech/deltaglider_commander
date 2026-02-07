/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";
export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react()],
    server: {
        // Note: Vite proxy has limitations with POST requests
        // We use VITE_API_URL in .env.local for development instead
        proxy: {
            "/api": {
                target: "http://localhost:8000",
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "../src/dgcommander/static",
        emptyOutDir: true,
        sourcemap: true,
        target: "es2020",
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./test/setup.ts"],
        clearMocks: true,
        globals: true,
    },
});
