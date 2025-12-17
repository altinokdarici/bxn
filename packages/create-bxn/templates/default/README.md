# {{PROJECT_NAME}}

A bxn HTTP API project.

## Getting Started

### Development

Start the development server with hot reload:

```bash
{{RUN_CMD}} dev
```

Your API will be available at `http://localhost:3000`

### Production

Build the project:

```bash
{{RUN_CMD}} build
```

Start the production server:

```bash
{{RUN_CMD}} start
```

## Project Structure

```
src/
└── routes/
    └── get.ts          → GET /
```

## Adding Routes

Create new route files using the file-system convention:

- `src/routes/users/get.ts` → `GET /users`
- `src/routes/users/post.ts` → `POST /users`
- `src/routes/users/$userId/get.ts` → `GET /users/:userId`

## Learn More

- [bxn Documentation](https://github.com/altinokdarici)
