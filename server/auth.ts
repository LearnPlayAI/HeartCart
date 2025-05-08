import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SchemaUser } from "@shared/schema";
import { rateLimit } from "express-rate-limit";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { sendSuccess, sendError } from "./api-response";
import { withStandardResponse } from "./response-wrapper";

const PostgresSessionStore = connectPg(session);

declare global {
  namespace Express {
    // Extend the User interface with our User type
    interface User {
      id: number;
      username: string;
      email: string;
      password: string;
      fullName: string | null;
      profilePicture: string | null;
      phoneNumber: string | null;
      address: string | null;
      city: string | null;
      postalCode: string | null;
      country: string | null;
      isActive: boolean;
      role: string;
      createdAt: Date;
      updatedAt: Date;
      lastLogin: Date | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many login attempts, please try again after 15 minutes",
});

// No longer using CSRF protection

function getSessionSecret(): string {
  // In production, this should be an environment variable
  return process.env.SESSION_SECRET || 'temusa-session-secret-dev-only';
}

export function setupAuth(app: Express): void {
  const sessionSettings: session.SessionOptions = {
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    store: new PostgresSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    })
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user as Express.User);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user as Express.User);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", withStandardResponse(async (req: Request, res: Response, next: NextFunction) => {
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      sendError(res, "Username already exists", 400);
      return null;
    }

    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(req.body.email);
    if (existingEmail) {
      sendError(res, "Email already exists", 400);
      return null;
    }

    // Hash password
    const hashedPassword = await hashPassword(req.body.password);

    // Create new user
    const user = await storage.createUser({
      ...req.body,
      password: hashedPassword
    });

    // Auto-login after registration
    return new Promise((resolve, reject) => {
      req.login(user as Express.User, (err) => {
        if (err) {
          reject(err);
          return;
        }
        // Return user data (excluding password)
        const { password, ...userData } = user;
        res.status(201); // Set status code for created
        resolve(userData);
      });
    });
  }));

  // Login endpoint
  app.post("/api/login", loginLimiter, withStandardResponse(async (req: Request, res: Response, next: NextFunction) => {
    return new Promise((resolve, reject) => {
      passport.authenticate("local", (err: Error, user: Express.User | false | null, info: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (!user) {
          sendError(res, info.message || "Authentication failed", 401);
          resolve(null);
          return;
        }
        req.login(user, (err) => {
          if (err) {
            reject(err);
            return;
          }
          // Return user data (excluding password)
          const { password, ...userData } = user;
          resolve(userData);
        });
      })(req, res, next);
    });
  }));

  // Logout endpoint
  app.post("/api/logout", withStandardResponse(async (req: Request, res: Response) => {
    return new Promise((resolve, reject) => {
      req.logout((err) => {
        if (err) {
          sendError(res, "Logout failed", 500);
          resolve(null);
          return;
        }
        resolve({ message: "Logged out successfully" });
      });
    });
  }));

  // Get current user endpoint
  app.get("/api/user", withStandardResponse(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      // Return null instead of error for non-authenticated users
      // This allows the client to handle both authenticated and non-authenticated states 
      // without throwing errors
      return null;
    }
    // Return user data (excluding password)
    const { password, ...userData } = req.user as Express.User;
    return userData;
  }));

  // Middleware to protect routes - requires authentication
  app.use("/api/protected/*", (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      sendError(res, "Authentication required", 401);
      return;
    }
    next();
  });

  // Middleware to protect admin routes - requires admin role
  app.use("/api/admin/*", (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      sendError(res, "Authentication required", 401);
      return;
    }
    if (req.user?.role !== 'admin') {
      sendError(res, "Admin access required", 403);
      return;
    }
    next();
  });

  // No longer using CSRF protection
  app.get("/api/csrf-token", withStandardResponse(async (req: Request, res: Response) => {
    return { message: "CSRF protection disabled" };
  }));
}