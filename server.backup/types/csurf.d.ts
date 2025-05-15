declare module 'csurf';

// Extend Express Request type to include csrfToken method
declare global {
  namespace Express {
    interface Request {
      csrfToken(): string;
    }
  }
}