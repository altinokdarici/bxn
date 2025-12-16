import { json, type RequestHandler, type Ok } from '@buildxn/http';

type Params = Record<string, never>;

// Define response type
interface HealthResponse {
  message: string;
  version: string;
  endpoints: {
    posts: string;
    authors: string;
    stream: string;
  };
}

type Response = Ok<HealthResponse>;

// GET / - API health check
const handler: RequestHandler<Params, Response> = (): Response => {
  return json({
    message: 'Blog API is running...',
    version: '1.0.0',
    endpoints: {
      posts: '/posts',
      authors: '/authors',
      stream: '/stream',
    },
  });
};

export default handler;
