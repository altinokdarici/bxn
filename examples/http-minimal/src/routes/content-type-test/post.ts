import { handle, json, StatusCode, contentType } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

// JSON body schema
const JsonBodySchema = Type.Object({
  name: Type.String(),
  value: Type.Number(),
});

// Form data body schema (application/x-www-form-urlencoded)
const FormBodySchema = Type.Object({
  username: Type.String(),
  password: Type.String(),
});

// Response schema
const ResponseSchema = Type.Object({
  contentType: Type.String(),
  receivedData: Type.Unknown(),
});

// POST /content-type-test - Different validation based on Content-Type
export default handle(
  {
    body: contentType({
      'application/json': JsonBodySchema,
      'application/x-www-form-urlencoded': FormBodySchema,
    }),
    response: {
      [StatusCode.Ok]: { body: ResponseSchema },
    },
  },
  (req) => {
    // Body type is inferred as union: { name: string, value: number } | { username: string, password: string }
    const reqContentType = req.headers?.['content-type']?.split(';')[0] ?? 'unknown';

    return json({
      contentType: reqContentType,
      receivedData: req.body,
    });
  },
);
