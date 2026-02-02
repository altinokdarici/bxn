import { route, json, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';
import { db, type Author } from '../../db.ts';

// Define query schema with TypeBox for validation
const QuerySchema = Type.Object({
  // Pagination
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  // Filtering
  search: Type.Optional(Type.String({ minLength: 1 })),
  // Array filter - supports ?id=1&id=2 to filter by multiple IDs
  id: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  // Sort order
  order: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')], { default: 'asc' })),
});

// Response schema for documentation and type safety
const AuthorSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  bio: Type.String(),
  website: Type.Optional(Type.String({ format: 'uri' })),
  social: Type.Optional(
    Type.Object({
      twitter: Type.Optional(Type.String()),
      github: Type.Optional(Type.String()),
    }),
  ),
  joinedAt: Type.String({ format: 'date-time' }),
});

const ResponseSchema = Type.Object({
  data: Type.Array(AuthorSchema),
  pagination: Type.Object({
    total: Type.Integer(),
    limit: Type.Integer(),
    offset: Type.Integer(),
    hasMore: Type.Boolean(),
  }),
});

// GET /authors - List all authors with pagination, search, and filtering
// Examples:
//   GET /authors?limit=5&offset=0
//   GET /authors?search=jane
//   GET /authors?id=1&id=2 (filter by multiple IDs)
//   GET /authors?order=desc
export default route()
  .query(QuerySchema)
  .response({
    [StatusCode.Ok]: {
      body: ResponseSchema,
    },
  })
  .handle((req) => {
    const { limit = 10, offset = 0, search, id, order = 'asc' } = req.query;

    let authors = Array.from(db.authors.values());

    // Filter by IDs (supports single or multiple)
    if (id !== undefined) {
      const ids = Array.isArray(id) ? id : [id];
      authors = authors.filter((author: Author) => ids.includes(author.id));
    }

    // Filter by search term (searches name and bio)
    if (search) {
      const searchLower = search.toLowerCase();
      authors = authors.filter(
        (author: Author) =>
          author.name.toLowerCase().includes(searchLower) || author.bio.toLowerCase().includes(searchLower),
      );
    }

    // Sort by name
    authors.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return order === 'desc' ? -cmp : cmp;
    });

    const total = authors.length;

    // Apply pagination
    const paginatedAuthors = authors.slice(offset, offset + limit);

    return json({
      data: paginatedAuthors,
      pagination: {
        time: 0,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  });
