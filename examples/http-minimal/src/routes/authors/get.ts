import { json, type RequestHandler, type Ok } from '@buildxn/http';
import { db, type Author } from '../../db.ts';

type Params = Record<string, never>;

// Define response type
type Response = Ok<Author[]>;

// GET /authors - List all authors
const handler: RequestHandler<Params, Response> = (): Response => {
  const authors = Array.from(db.authors.values());
  return json(authors);
};

export default handler;
