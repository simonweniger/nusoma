<p align="center">
  <img src="apps/nusoma/public/static/nusoma.png" alt="nusoma Logo" width="500"/>
</p>

<p align="center">
  <a href="https://www.apache.org/licenses/LICENSE-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License: Apache-2.0"></a>
  <a href="#"><img src="https://img.shields.io/badge/Discord-Join%20Server-7289DA?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/nusoma"><img src="https://img.shields.io/twitter/follow/nusoma?style=social" alt="Twitter"></a>
  <a href="https://github.com/nusoma/nusoma/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome"></a>
  <a href="https://docs.nusoma.app"><img src="https://img.shields.io/badge/Docs-visit%20documentation-blue.svg" alt="Documentation"></a>
</p>

<p align="center">
  <strong>nusoma</strong> is a lightweight, user-friendly platform for building AI agent workers.
</p>

## Getting Started

1. Use our [cloud-hosted version](https://nusoma.app)
2. Self-host using one of the methods below

## Self-Hosting

### Requirements

- Docker must be installed and running on your machine

### Option 2: Docker Compose

```bash
# Clone the repository
git clone https://github.com/nusomaai/nusoma.git

# Navigate to the project directory
cd nusoma

# Start nusoma
docker compose -f docker-compose.prod.yml up -d
```

Access the application at [http://localhost:3000/](http://localhost:3000/)

#### Using Local Models

To use local models with nusoma:

1. Pull models using our helper script:

```bash
./apps/nusoma/scripts/ollama_docker.sh pull <model_name>
```

2. Start nusoma with local model support:

```bash
# With NVIDIA GPU support
docker compose --profile local-gpu -f docker-compose.ollama.yml up -d

# Without GPU (CPU only)
docker compose --profile local-cpu -f docker-compose.ollama.yml up -d

# If hosting on a server, update the environment variables in the docker-compose.prod.yml file to include the server's public IP then start again (OLLAMA_URL to i.e. http://1.1.1.1:11434)
docker compose -f docker-compose.prod.yml up -d
```

### Option 3: Manual Setup

1. Clone and install dependencies:

```bash
git clone https://github.com/nusomaai/nusoma.git
cd nusoma
bun install
```

2. Setup supabase locally

```bash
bun run local:db:start
```

Inside of the supabase studio you need to
    - install the queues extention (under integrations)
    - create a new queue called `task_queue`
    - add the vector extension (under database --> extensions)
    - enable realtime for app task related tabels and worker related tables (under replication)

3. Set up environment:

```bash
cd apps/nusoma
cp .env.example .env  # Configure with required variables (DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL)
```

4. Set up the database:

```bash
bun db:push
```

4. Start the development server:

```bash
bun run dev
```

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Runtime**: [Bun](https://bun.sh/)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team) & Supabase
- **Authentication**: [Better Auth](https://better-auth.com)
- **UI**: [Shadcn](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Flow Editor**: [ReactFlow](https://reactflow.dev/)
- **Docs**: [Fumadocs](https://fumadocs.vercel.app/)
- **Monorepo**: [Turborepo](https://turborepo.org/)
