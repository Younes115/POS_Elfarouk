# AI Agent Global Context & Invocation Rules

This directory (`/.agents`) is dedicated to storing global context, high-level project goals, and specific rules for invoking different autonomous agents.

## Core Directives for All Agents
1. **Always Consult `/skills`**: Before beginning any complex task (e.g., creating a new feature, writing tests, domain modeling), you must consult the relevant skill document in the `/skills` repository folder.
2. **Adhere to the Architecture**: The application strictly separates the React Frontend (`/src/renderer`) and the Electron Backend (`/src/main`).
3. **Database Rules**: Always use Prisma ORM located in `/src/main/prisma`. Remember that for packaged production, the SQLite database is resolved via Electron's `app.getPath('userData')`.
