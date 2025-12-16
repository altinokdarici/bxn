// Mock database - In a real app, this would be a database connection

export interface Author {
  id: string;
  name: string;
  email: string;
  bio: string;
  website?: string;
  social?: {
    twitter?: string;
    github?: string;
  };
  joinedAt: string;
}

// Mock data store
export const db = {
  authors: new Map<string, Author>([
    [
      '1',
      {
        id: '1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        bio: 'Senior software engineer and technical writer with over 10 years of experience',
        website: 'https://janedoe.dev',
        social: {
          twitter: '@janedoe',
          github: 'janedoe',
        },
        joinedAt: '2024-01-01T00:00:00Z',
      },
    ],
    [
      '2',
      {
        id: '2',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        bio: 'Full-stack developer passionate about TypeScript and modern web technologies',
        website: 'https://bobwilson.io',
        social: {
          twitter: '@bobwilson',
          github: 'bobwilson',
        },
        joinedAt: '2024-03-15T00:00:00Z',
      },
    ],
  ]),
};
