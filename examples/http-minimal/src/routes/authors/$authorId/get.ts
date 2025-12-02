import { handle, json, notFound, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';
import { db } from '../../../db.ts';

const ParamsSchema = Type.Object({
    authorId: Type.String({ minLength: 1 }),
});

const AuthorSchema = Type.Object({
    id: Type.String(),
    name: Type.String(),
    email: Type.String(),
    bio: Type.String(),
    website: Type.Optional(Type.String()),
    social: Type.Optional(Type.Object({
        twitter: Type.Optional(Type.String()),
        github: Type.Optional(Type.String()),
    })),
    joinedAt: Type.String(),
});

const ErrorSchema = Type.Object({
    error: Type.String(),
});

// GET /authors/:authorId - Get author details
export default handle(
    {
        params: ParamsSchema,
        response: {
            [StatusCode.Ok]: { body: AuthorSchema },
            [StatusCode.NotFound]: { body: ErrorSchema },
        },
    },
    (req) => {
        const author = db.authors.get(req.params.authorId);
        if (!author) {
            return notFound({ error: 'Author not found' });
        }
        return json(author);
    }
);
