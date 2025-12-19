import { json, type Handler, type Ok } from '@buildxn/http';

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

// GET / - API health check
const handler: Handler<{ response: Ok<HealthResponse> }> = () => {
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
