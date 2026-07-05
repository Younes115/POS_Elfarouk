# Offline POS System for Footwear & Bags

A comprehensive, production-ready project workspace for an offline Point of Sale (POS) desktop application tailored for footwear and bag retailers.

## Tech Stack
- **Desktop Environment**: Electron.js
- **Frontend**: React.js (via Vite) + TypeScript + Tailwind CSS
- **Database & ORM**: SQLite with Prisma ORM v6

---

> [!IMPORTANT]  
> **AI Agent Configuration Note**  
> Any AI assistant working in this repository MUST ALWAYS check the `/skills` folder for standardized workflows and guidelines before executing complex tasks. The `/skills` directory contains markdown files dictating engineering, architectural, and productivity rules (e.g., domain-modeling, tdd, implement). Furthermore, check `/.agents` for global context and specific invocation rules.

---

## Folder Structure Overview
The repository architecture strictly separates the backend (main process) and frontend (renderer process) to ensure security and maintainability:

- `/docs`: Technical documentation, PRDs, and Domain Models.
- `/.agents`: Root directory for agent-specific instructions and global context.
- `/skills`: AI Agent skills framework (based on mattpocock/skills architecture).
- `/src/main`: Electron main process, IPC handlers, and backend logic. This layer securely manages the Prisma SQLite connection and system resources.
- `/src/main/prisma`: Prisma schema, migrations, and local SQLite database (`dev.db`).
- `/src/renderer`: React frontend assets and UI components. This layer contains no direct system access.
- `/tests`: Testing directory (supporting AAA pattern).

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (used as the primary package manager for Electron compatibility)

## Installation & Setup

1. **Clone the repository** (if applicable):
   ```bash
   git clone <repository-url>
   cd PROJECT
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   Create the initial SQLite database and run migrations:
   ```bash
   npx prisma migrate dev --name init --schema=src/main/prisma/schema.prisma
   ```

## Development
To start the application in development mode with Hot Module Replacement (HMR):
```bash
npm run dev
```

*(Note: Currently, Vite spins up the React environment. The Electron runner configuration will soon be attached to launch Electron alongside Vite.)*

## Production Build
To package the application for distribution:
```bash
npm run build
```
*(Note: Electron Builder will package the application and securely resolve the SQLite database path into the user's `userData` directory to prevent permission read-only issues.)*
