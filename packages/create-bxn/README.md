# create-bxn

Scaffolding tool for bxn HTTP projects.

## Usage

```bash
npm create bxn@latest
# or
pnpm create bxn
# or
yarn create bxn
```

This will:

1. Prompt for a project name
2. Ask which package manager you prefer (pnpm/npm/yarn)
3. Create a new directory with:
   - Basic project structure (`src/routes/`)
   - TypeScript configuration
   - Example route handler
   - README with instructions
4. Optionally install dependencies
5. Show next steps

## What Gets Created

```
my-project/
├── package.json          # With @buildxn/http and bxn
├── tsconfig.json         # TypeScript config
├── .gitignore
├── README.md             # Project-specific readme
└── src/
    └── routes/
        └── get.ts        # Example GET / route
```

## After Creation

```bash
cd my-project
pnpm dev                  # Start dev server with hot reload
```

Your API will be running at `http://localhost:3000`

## Development

```bash
pnpm build                # Build the CLI
```
