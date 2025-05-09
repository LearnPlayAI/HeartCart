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
import { logger } from "./logger";
import { AppError, ErrorCode, ForbiddenError, NotFoundError } from "./error-handler";
import { isAuthenticated, isAdmin } from "./auth-middleware";

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

/**
 * Get session secret, ensuring it's available and secure
 * @returns {string} The session secret to use
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || 'temusa-session-secret-dev-only';
  
  // In production, require a properly set session secret
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    logger.error('SESSION_SECRET environment variable not set in production mode');
    throw new Error('SESSION_SECRET environment variable is required in production');
  }
  
  return secret;
}

/**
 * Setup authentication and session management for the Express application
 * @param {Express} app - The Express application
 */
export function setupAuth(app: Express): void {
  // Session durations
  const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours maximum session lifetime
  const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity before session expiration

  // Configure session settings with improved security
  const sessionSettings: session.SessionOptions = {
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    name: 'tmy_session', // Custom name to avoid using default 'connect.sid'
    rolling: true, // Reset cookie expiration on activity
    cookie: {
      secure: process.env.NODE_ENV === "production", // Require HTTPS in production
      httpOnly: true, // Prevent client-side JS from accessing the cookie
      sameSite: 'lax', // Provides some CSRF protection
      maxAge: SESSION_MAX_AGE, // Maximum lifetime
      path: '/', // Restrict cookie to root path
    },
    store: new PostgresSessionStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
      // Cleanup expired sessions periodically
      pruneSessionInterval: 60, // Check for expired sessions every minute
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

  /**
   * Deserialize user from session - extract user data from db using session id
   * Improved version with enhanced error logging and recovery mechanism
   */
  passport.deserializeUser(async (id: number, done) => {
    try {
      // Try to retrieve user data
      const user = await storage.getUser(id);
      
      // If user no longer exists in the database
      if (!user) {
        logger.warn('Session user not found in database', { userId: id });
        return done(null, false);
      }
      
      // Return user data (with proper typing)
      done(null, user as Express.User);
    } catch (error) {
      // Log detailed error for debugging
      logger.error('Session deserialization error', { 
        userId: id, 
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined 
      });
      
      // Pass error to the next handler
      done(error);
    }
  });

  // Registration endpoint with enhanced validation and error handling
  app.post("/api/register", withStandardResponse(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract and sanitize required fields
      let { username, email, password, fullName } = req.body;
      
      // Basic sanitization - trim whitespace from all inputs
      username = username?.trim();
      email = email?.trim();
      password = password?.toString(); // Keep password as is, but ensure it's a string
      fullName = fullName?.trim();
      
      if (!username || !email || !password) {
        throw new AppError(
          "Missing required fields",
          ErrorCode.VALIDATION_ERROR,
          400,
          { fields: ['username', 'email', 'password'] }
        );
      }
      
      // Validate username format (alphanumeric with underscore, 3-20 chars)
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        throw new AppError(
          "Username must be 3-20 characters and contain only letters, numbers, and underscores",
          ErrorCode.VALIDATION_ERROR,
          400,
          { field: 'username', value: username }
        );
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError(
          "Please enter a valid email address",
          ErrorCode.VALIDATION_ERROR,
          400,
          { field: 'email', value: email }
        );
      }
      
      // Validate password strength (min 6 chars, at least one number and letter)
      if (password.length < 6) {
        throw new AppError(
          "Password must be at least 6 characters",
          ErrorCode.VALIDATION_ERROR,
          400,
          { field: 'password' }
        );
      }
      
      // Check for at least one letter and one number
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasLetter || !hasNumber) {
        throw new AppError(
          "Password must contain at least one letter and one number",
          ErrorCode.VALIDATION_ERROR,
          400,
          { field: 'password' }
        );
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        throw new AppError(
          "Username already exists",
          ErrorCode.DUPLICATE_ENTRY,
          400,
          { field: 'username', value: username }
        );
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        throw new AppError(
          "Email already exists",
          ErrorCode.DUPLICATE_ENTRY,
          400,
          { field: 'email', value: email }
        );
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Set default role for new users (regular user)
      const userRole = 'user';
      
      // Create new user with standardized fields
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        role: userRole,
        isActive: true
      });

      // Log successful registration
      logger.info('New user registered', { 
        userId: user.id, 
        username, 
        email,
        role: userRole,
        ip: req.ip 
      });

      // Auto-login after registration
      return new Promise((resolve, reject) => {
        req.login(user as Express.User, (err) => {
          if (err) {
            logger.error('Auto-login after registration failed', { 
              error: err,
              userId: user.id,
              username,
              email
            });
            reject(err);
            return;
          }
          // Update last login timestamp on registration
          storage.updateUserLastLogin(user.id).catch(err => {
            logger.error('Failed to update last login timestamp on registration', {
              error: err,
              userId: user.id
            });
          });
          
          // Return user data (excluding password)
          const { password, ...userData } = user;
          res.status(201); // Set status code for created
          resolve(userData);
        });
      });
    } catch (error) {
      // Handle specific error types from validation
      if (error instanceof AppError) {
        throw error;
      }
      
      // Log unexpected errors
      logger.error('Registration error', { 
        error,
        username: req.body.username,
        email: req.body.email,
        ip: req.ip
      });
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Registration failed. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));

  // Login endpoint with enhanced validation and security
  app.post("/api/login", loginLimiter, withStandardResponse(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate required fields first
      const { email, password } = req.body;
      
      if (!email || !password) {
        throw new AppError(
          "Email and password are required",
          ErrorCode.VALIDATION_ERROR,
          400,
          { fields: ['email', 'password'] }
        );
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError(
          "Please enter a valid email address",
          ErrorCode.VALIDATION_ERROR,
          400,
          { field: 'email' }
        );
      }
      
      // Handle empty password
      if (password.trim() === '') {
        throw new AppError(
          "Password cannot be empty",
          ErrorCode.VALIDATION_ERROR,
          400,
          { field: 'password' }
        );
      }
      
      return new Promise((resolve, reject) => {
        passport.authenticate("local", (err: Error, user: Express.User | false | null, info: any) => {
          // Handle unexpected errors
          if (err) {
            logger.error('Login authentication error', { 
              error: err,
              email,
              ip: req.ip
            });
            reject(new AppError(
              "Authentication failed. Please try again.",
              ErrorCode.AUTHENTICATION_ERROR,
              500,
              { originalError: err }
            ));
            return;
          }
          
          // Handle invalid credentials
          if (!user) {
            // Log failed login attempt
            logger.warn('Failed login attempt', {
              email,
              reason: info?.message || 'Invalid credentials',
              ip: req.ip,
              timestamp: new Date().toISOString()
            });
            
            // Return standardized auth error
            sendError(res, "Invalid email or password", 401);
            resolve(null);
            return;
          }
          
          // Attempt to log the user in
          req.login(user, (err) => {
            if (err) {
              logger.error('Session creation error on login', { 
                error: err,
                userId: user.id,
                email,
                ip: req.ip
              });
              
              reject(new AppError(
                "Failed to create session. Please try again.",
                ErrorCode.AUTHENTICATION_ERROR,
                500,
                { originalError: err }
              ));
              return;
            }
            
            // Log successful login
            logger.info('User logged in successfully', { 
              userId: user.id,
              email,
              role: user.role,
              ip: req.ip,
              timestamp: new Date().toISOString()
            });
            
            // Update last login timestamp
            storage.updateUserLastLogin(user.id).catch(err => {
              logger.error('Failed to update last login timestamp', {
                error: err,
                userId: user.id
              });
            });
            
            // Return user data (excluding password)
            const { password, ...userData } = user;
            resolve(userData);
          });
        })(req, res, next);
      });
    } catch (error) {
      // Handle specific error types from validation
      if (error instanceof AppError) {
        throw error;
      }
      
      // Log unexpected errors
      logger.error('Login error', { 
        error,
        email: req.body.email,
        ip: req.ip
      });
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Login failed. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
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
  
  // Session refresh endpoint - lightweight endpoint just to keep session alive
  app.post("/api/session/refresh", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    // Simply return success - the session cookie will be updated automatically 
    // due to the 'rolling: true' option in the session configuration
    const userId = (req.user as Express.User).id;
    logger.debug('Session refreshed', { userId, timestamp: new Date().toISOString() });
    return { message: "Session refreshed successfully" };
  }));

  // Use standardized authentication middleware for protected routes
  // Uses the centralized authentication check utility 
  app.use("/api/protected/*", isAuthenticated);

  // Use standardized authorization middleware for admin routes
  // Uses the centralized authentication and permission check utilities
  app.use("/api/admin/*", isAdmin);

  // No longer using CSRF protection
  app.get("/api/csrf-token", withStandardResponse(async (req: Request, res: Response) => {
    return { message: "CSRF protection disabled" };
  }));

  // User profile update endpoint
  app.put("/api/users/:id", isAuthenticated, withStandardResponse(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const currentUser = req.user as Express.User;

    try {
      // Verify the user can only update their own profile unless they're an admin
      if (userId !== currentUser.id && currentUser.role !== 'admin') {
        throw new ForbiddenError("You can only update your own profile");
      }

      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        throw new NotFoundError(`User with ID ${userId} not found`, "user");
      }

      // Create update data - prevent email changes as it's used for login
      const { email, ...allowedUpdates } = req.body;

      // If they're trying to change email, reject the request
      if (email && email !== existingUser.email) {
        throw new AppError(
          "Email cannot be changed as it is used for login",
          ErrorCode.INVALID_OPERATION,
          400
        );
      }

      // Update user profile
      const updatedUser = await storage.updateUser(userId, allowedUpdates);
      if (!updatedUser) {
        throw new AppError(
          "Failed to update user profile",
          ErrorCode.DATABASE_ERROR,
          500
        );
      }

      // Return updated user data (excluding password)
      const { password, ...userData } = updatedUser;
      logger.info('User profile updated', { userId, fields: Object.keys(allowedUpdates) });
      return userData;
    } catch (error) {
      // Log detailed error information with context
      logger.error('Error updating user profile', { 
        error,
        userId,
        currentUserId: currentUser.id,
        isAdmin: currentUser.role === 'admin',
        requestBody: req.body
      });
      
      // Handle specific error types
      if (error instanceof NotFoundError || 
          error instanceof ForbiddenError || 
          error instanceof AppError) {
        throw error;
      }
      
      // Return generic error for unexpected issues
      throw new AppError(
        "Failed to update profile. Please try again.",
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { originalError: error }
      );
    }
  }));
}