import { type Ok, json, type Unauthorized, unauthorized } from './http-result.ts';
import type { Handler, Middleware } from './types.ts';

const get: Handler<
  {
    headers: { cookie: string };
    body: { name: string };
    response: Ok<{ message: string }>;
  } & AuthContext
> = (ctx) => {
  return json({ message: `Hello ${ctx.body.name} ${ctx.user.name}` });
};

type AuthContext = { user: { id: number; name: string } };

const auth: Middleware<
  {
    headers: { authorization: string };
    response: Unauthorized;
  },
  AuthContext
> = (ctx, next) => {
  const token = ctx.headers.authorization.split(' ')[1];
  if (token !== 'valid-token') {
    return unauthorized();
  }

  return next({ ...ctx, user: { id: 1, name: 'John Doe' } });
};

export default [auth, get];
