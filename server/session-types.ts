import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: {
      id: number;
      username: string;
      email: string;
      is_admin: boolean;
      is_active: boolean;
      first_name?: string;
      last_name?: string;
    };
  }
}