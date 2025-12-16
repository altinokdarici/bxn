import { handle, json, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

// With additionalProperties: false, AJV will remove extra fields
const BodySchema = Type.Object(
  {
    name: Type.String(),
    value: Type.Number(),
  },
  { additionalProperties: false },
);

// Headers schema - validates required headers
const HeadersSchema = Type.Object({
  'x-api-key': Type.String({ minLength: 1 }),
  'x-request-id': Type.Optional(Type.String()),
});

// Response schema matches input - to verify removeAdditional removes extra fields
const ResponseSchema = Type.Object({
  receivedBody: Type.Object({
    name: Type.String(),
    value: Type.Number(),
  }),
  apiKey: Type.String(),
});

// POST /test - Echo back the validated body to verify removeAdditional
export default handle(
  {
    body: BodySchema,
    headers: HeadersSchema,
    response: {
      [StatusCode.Ok]: { body: ResponseSchema },
    },
  },
  (req) => {
    // Echo back the body and the validated header
    return json({
      receivedBody: req.body,
      apiKey: req.headers['x-api-key'] as string,
    });
  },
);
