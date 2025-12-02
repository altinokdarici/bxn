import { handle, json, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';
import { db, type Author } from '../../db.ts';

const BodySchema = Type.Object({
    name: Type.String({ minLength: 1 }),
    email: Type.String({ format: 'email' }),
    bio: Type.String(),
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

// POST /authors - Create a new author
// Returns the body as-is to verify removeAdditional behavior
export default handle(
    {
        body: BodySchema,
        response: {
            [StatusCode.Created]: { body: AuthorSchema },
        },
    },
    (req) => {
        // Log the body to see what AJV passed through
        console.log('Received body after validation:', JSON.stringify(req.body));

        const id = String(db.authors.size + 1);
        const author: Author = {
            id,
            name: req.body.name,
            email: req.body.email,
            bio: req.body.bio,
            joinedAt: new Date().toISOString(),
        };

        db.authors.set(id, author);
        return json(author, StatusCode.Created);
    }
);
