# Getting Started (Onboarding)

Welcome to the team! This guide will get you productive in [project name] in about 1-2 hours.

## Prerequisites

Before starting, make sure you have installed:

- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+ (comes with Node.js)
- Git ([Download](https://git-scm.com/))
- Docker & Docker Compose (optional but recommended) ([Download](https://www.docker.com/))
- [Other tools: PostgreSQL, Redis, etc.]

**Check your versions:**
```bash
node --version     # Should be v18+ (e.g., v20.8.0)
npm --version      # Should be 9+ (e.g., 10.1.0)
git --version      # Should be installed
```

## Step 1: Clone and Install (5 minutes)

```bash
# Clone the repository
git clone https://github.com/org/project-name.git
cd project-name

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**What should happen:** No errors, `node_modules/` folder created.

## Step 2: Set Up Your Environment (10 minutes)

### Database Setup (if applicable)

If you're using Docker Compose for local dev:

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run database migrations
npm run db:migrate

# Seed with test data (optional)
npm run db:seed
```

Or, if you have PostgreSQL running locally:

```bash
# Create local database
createdb project_name_dev

# Update .env with your connection string
DATABASE_URL=postgres://localhost/project_name_dev

# Run migrations
npm run db:migrate
```

### Environment Variables

Check `.env.example` to see what variables you need. Here are the essentials:

```bash
# .env file
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://localhost/project_name_dev
JWT_SECRET=dev-secret-key-change-in-production
LOG_LEVEL=debug
```

[Detailed explanation of each variable goes here or link to `docs/ENV_VARIABLES.md`]

## Step 3: Start the Development Server (5 minutes)

```bash
npm run dev
```

**Expected output:**
```
[timestamp] info: Server listening on http://localhost:3000
[timestamp] debug: Connected to database
```

**Test it:**
```bash
# In another terminal
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

Visit http://localhost:3000 in your browser.

## Step 4: Verify Everything Works (10 minutes)

Run the test suite to confirm setup:

```bash
npm test
```

**Expected:** Most tests pass (a few might fail due to environment differences).

Run the linter:

```bash
npm run lint
```

**Expected:** No errors (warnings are okay).

## Step 5: Explore the Codebase (15-20 minutes)

Open `src/` and take a look:

```bash
# Check the folder structure
ls -la src/

# Look at the main files
cat src/index.ts          # App entry point
cat src/api/routes.ts     # API routes
cat src/services/         # Business logic
```

Refer to [Repository Map](../REPO_MAP.md) for a guided tour of the codebase.

## Step 6: Make Your First Change (30 minutes)

Make a small change to get familiar with the development flow:

### Find an Easy First Task

Ask your team lead or search the issue tracker for issues labeled `good-first-issue` or `help-wanted`.

**Example task:** Add a new API endpoint that returns a greeting.

### Create a Feature Branch

```bash
git checkout -b feat/my-first-feature
```

### Make a Change

Edit `src/api/routes.ts` (or create a new file):

```typescript
// Add a new route
app.get('/api/hello/:name', (req, res) => {
  res.json({ message: `Hello, ${req.params.name}!` });
});
```

### Test Your Change

```bash
# Run tests
npm test

# Start the server and test manually
npm run dev
curl http://localhost:3000/api/hello/Alice
# Response: {"message":"Hello, Alice!"}
```

### Commit and Push

```bash
git add src/api/routes.ts
git commit -m "feat: add hello endpoint"
git push origin feat/my-first-feature
```

### Submit a Pull Request

Go to GitHub and open a PR. Add a description of your change.

### Code Review

Expect feedback from your team. Make requested changes, push again, and iterate.

Once approved, your PR will be merged!

## Code Style & Conventions

This project follows these conventions:

### Formatting
- **Formatter:** Prettier (automatic on save)
- **Linter:** ESLint

```bash
# Auto-fix issues
npm run lint:fix
```

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `user-service.ts`)
- Classes/Types: `PascalCase` (e.g., `UserService`)
- Functions/Variables: `camelCase` (e.g., `getUserById`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)

### Commit Messages
Follow the conventional commits format:

```
feat: add new feature
fix: fix a bug
docs: update documentation
refactor: refactor code without changing behavior
test: add or update tests
chore: maintenance tasks
```

Example:
```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve race condition in database query"
```

### TypeScript
- All source files should be `.ts` (not `.js`)
- Always type function parameters and return values
- Avoid `any` type

```typescript
// Good
function createUser(email: string, name: string): Promise<User> {
  // ...
}

// Avoid
function createUser(email, name) {
  // ...
}
```

## Project Structure at a Glance

```
project-name/
├── src/                     # Application code
│   ├── index.ts            # Entry point
│   ├── api/                # HTTP routes and handlers
│   ├── services/           # Business logic
│   ├── db/                 # Database models and migrations
│   ├── utils/              # Utilities and helpers
│   └── types/              # TypeScript types
├── test/ or __tests__/      # Test files (mirror src/ structure)
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── REPO_MAP.md
│   ├── API.md
│   └── ENV_VARIABLES.md
├── infra/                   # Docker, Kubernetes, Terraform
├── .env.example            # Environment variables template
├── .env.local              # Your local environment (git-ignored)
├── package.json            # Dependencies and scripts
├── README.md               # Project README
└── docker-compose.yml      # Local dev environment
```

For a detailed tour, see [Repository Map](../REPO_MAP.md).

## Useful Commands

```bash
# Development
npm run dev                 # Start dev server (with hot reload)
npm run build              # Build for production
npm start                  # Run production build

# Testing
npm test                   # Run all tests
npm test -- --watch      # Watch mode (re-run on file change)
npm run test:coverage    # Test coverage report

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Auto-fix style issues
npm run type:check       # TypeScript type checking

# Database (if applicable)
npm run db:migrate       # Run migrations
npm run db:seed          # Load test data
npm run db:rollback      # Undo last migration

# Deployment (staging/production)
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production
```

See `package.json` or `Makefile` for all available commands.

## Common Issues & Troubleshooting

### "Module not found" error

```bash
# Make sure dependencies are installed
npm install

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database connection fails

```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
npm run db:test-connection

# Ensure database exists
createdb project_name_dev

# Run migrations
npm run db:migrate
```

### Port 3000 already in use

Change the PORT in `.env`:
```bash
PORT=3001
npm run dev
```

### Tests fail

```bash
# Make sure you're on the latest code
git pull

# Clear test cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --verbose
```

For more issues, see [Troubleshooting Guide](../TROUBLESHOOTING.md).

## Getting Help

- **General questions:** Ask in #project-name Slack channel
- **Bugs/Features:** [GitHub Issues](https://github.com/org/project-name/issues)
- **On-call support:** See [Runbook](../DEPLOYMENT.md#support)
- **Documentation:** Check [docs/](../docs/) folder
- **Mentorship:** Set up pairing session with [Team Lead Name]

## Next Steps

1. **Set up your IDE:**
   - VS Code: Install ESLint and Prettier extensions
   - WebStorm: Built-in support for most of the above

2. **Read the core docs:**
   - [Repository Map](../REPO_MAP.md) — Code organization
   - [Architecture Overview](../ARCHITECTURE.md) — System design
   - [Contributing Guide](../../CONTRIBUTING.md) — Development workflow

3. **Pick your first task:**
   - Ask your team lead for a `good-first-issue`
   - Look for issues labeled `help-wanted`

4. **Pair with a teammate:**
   - Spend 30 minutes pairing on a feature to learn the codebase
   - Ask questions! It's expected.

5. **Submit your first PR:**
   - Make a small change (documentation fix, utility, small feature)
   - Open a PR with a clear description
   - Respond to code review feedback

## Maintenance

This guide was last updated: **[DATE]**

If you spot outdated information, please:
1. Create an issue: [GitHub Issues](https://github.com/org/project-name/issues)
2. Or update this file and submit a PR

---

**Welcome to the team!** We're excited to have you. Don't hesitate to ask questions in #project-name.
