import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users, User } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import csurf from "csurf";

// Extend Express.User type declaration
declare global {
  namespace Express {
    // This creates a User interface in Express namespace that includes our User type
    interface User {
      id: number;
      username: string;
      email: string;
      password: string;
      // Include other fields as needed, but at minimum these are required
    }
  }
}

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

// Hash password with scrypt and salt
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare provided password with stored hashed password
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate a secure random SESSION_SECRET if not provided
function getSessionSecret(): string {
  return process.env.SESSION_SECRET || randomBytes(32).toString("hex");
}

// Set up authentication middleware
export function setupAuth(app: Express): void {
  // Create session store
  const PostgresStore = connectPgSimple(session);
  const sessionStore = new PostgresStore({
    pool,
    tableName: "sessions", // Default table name for sessions
    createTableIfMissing: true,
  });

  // Configure security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // For development - tighten in production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
      },
    },
  }));

  // Configure session middleware
  const sessionSettings: session.SessionOptions = {
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
    },
    name: "temu_sa_session", // Custom session name
  };

  // Set up sessions
  app.set("trust proxy", 1); // Trust first proxy
  app.use(session(sessionSettings));

  // Initialize passport and session
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure CSRF protection
  const csrfProtection = csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  });

  // Configure rate limiting for login attempts
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window per IP
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Configure passport to use local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Find user by username
        const [user] = await db.select().from(users).where(eq(users.username, username));
        
        // Check if user exists and password is correct
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        // Success - return user
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // API endpoint for user registration
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if username already exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, req.body.username));
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      if (req.body.email) {
        const [existingEmail] = await db.select().from(users).where(eq(users.email, req.body.email));
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);

      // Create new user
      const [newUser] = await db.insert(users)
        .values({
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword,
          fullName: req.body.fullName || null,
          profilePicture: req.body.profilePicture || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;

      // Log in the new user
      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // API endpoint for user login with rate limiting
  app.post("/api/login", loginLimiter, (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error, user: Express.User, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // API endpoint for user logout
  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // API endpoint to get current user
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user;
    return res.status(200).json(userWithoutPassword);
  });

  // Middleware to protect routes that require authentication
  app.use("/api/protected/*", (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  });

  // Add CSRF protection to state-changing endpoints
  // This adds a CSRF token to req.csrfToken() 
  // The client will need to include this token in state-changing requests
  app.use("/api/register", csrfProtection);
  app.use("/api/login", csrfProtection);
  app.use("/api/logout", csrfProtection);
  app.use("/api/protected", csrfProtection);
  
  // Endpoint to get CSRF token
  app.get("/api/csrf-token", csrfProtection, (req: Request, res: Response) => {
    res.json({ csrfToken: req.csrfToken() });
  });
}