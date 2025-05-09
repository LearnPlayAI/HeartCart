/**
 * Database Testing Routes
 * 
 * This module adds routes for testing and validating the database system.
 * These routes execute tests against the REAL database, using EXISTING database connections,
 * models, and queries. We test ACTUAL application functionality and code paths.
 */

import { Express, Request, Response, NextFunction } from 'express';
import { db, pool } from "./db";
import { storage } from "./storage";
import { isAdmin } from "./auth-middleware";
import { sendSuccess, sendError } from "./api-response";
import { logger } from "./logger";
import * as schema from "@shared/schema";
import { SQL, sql } from "drizzle-orm";

/**
 * Register all database testing routes
 * @param app - Express application instance
 */
export function registerDatabaseTestRoutes(app: Express): void {
  // Only register these routes in development mode
  if (process.env.NODE_ENV !== 'development') {
    logger.info('Database test routes not registered in production mode');
    return;
  }
  
  logger.info('Registering database testing routes');
  
  // Custom admin check middleware that works with the override in routes.ts
  const dbTestAdminCheck = (req: Request, res: Response, next: NextFunction) => {
    // Check if user exists and has admin role
    const user = req.user as any;
    if (user && user.role === 'admin') {
      logger.debug('Database test admin check passed', { 
        userId: user.id,
        path: req.path,
        method: req.method
      });
      return next();
    }
    
    // Auto-approve in development for easier testing (if auth is disabled)
    if (process.env.NODE_ENV === 'development' && !req.isAuthenticated) {
      logger.warn('Database test admin check bypassed in development mode');
      return next();
    }
    
    logger.warn('Database test admin check failed', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return sendError(res, "Admin access required for database tests", 403);
  };
  
  // Test table structure against our schema definitions
  app.get("/api/db-test/table-structure", dbTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running table structure tests');
      
      // Get all actual tables from PostgreSQL
      const client = await pool.connect();
      let tables: string[] = [];
      
      try {
        const tableQuery = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `);
        
        tables = tableQuery.rows.map(row => row.table_name);
      } finally {
        client.release();
      }
      
      // Get expected tables from our Drizzle schema
      const expectedTables = Object.keys(schema)
        .filter(key => {
          // Only include table definitions (which have $type with '$inferSelect')
          const item = (schema as any)[key];
          return item && typeof item === 'object' && item.$type && 
                 item.$type.includes('Table') && !key.includes('Relations');
        });
      
      // Compare actual tables with expected tables
      const missingTables = expectedTables.filter(table => !tables.includes(table));
      const unexpectedTables = tables.filter(table => 
        !expectedTables.includes(table) && 
        table !== 'session' && 
        !table.includes('drizzle')
      );
      
      // Test column definitions for each table
      const columnTests = await Promise.all(
        expectedTables.filter(table => tables.includes(table)).map(async (tableName) => {
          // Get actual columns from PostgreSQL
          const client = await pool.connect();
          let actualColumns: { column_name: string, data_type: string }[] = [];
          
          try {
            const columnQuery = await client.query(`
              SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = $1
              ORDER BY column_name;
            `, [tableName]);
            
            actualColumns = columnQuery.rows;
          } finally {
            client.release();
          }
          
          // Get expected columns from our Drizzle schema
          const tableSchema = (schema as any)[tableName];
          if (!tableSchema) {
            return {
              tableName,
              status: 'failed',
              message: 'Table exists but schema definition not found',
              missingColumns: [],
              extraColumns: actualColumns.map(col => col.column_name)
            };
          }
          
          const expectedColumns = Object.keys(tableSchema).filter(key => 
            typeof tableSchema[key] === 'object' && !key.startsWith('$')
          );
          
          const missingColumns = expectedColumns.filter(col => 
            !actualColumns.some(actualCol => actualCol.column_name === tableSchema[col].name)
          );
          
          const extraColumns = actualColumns.filter(col => 
            !expectedColumns.some(expectedCol => 
              tableSchema[expectedCol].name === col.column_name
            )
          ).map(col => col.column_name);
          
          return {
            tableName,
            status: missingColumns.length === 0 && extraColumns.length === 0 ? 'passed' : 'failed',
            message: missingColumns.length === 0 && extraColumns.length === 0 ? 
              'Table structure matches schema definition' : 
              'Table structure differs from schema definition',
            missingColumns,
            extraColumns
          };
        })
      );
      
      // Calculate overall status
      const status = missingTables.length === 0 && 
                     unexpectedTables.length === 0 && 
                     columnTests.every(test => test.status === 'passed') ? 
                     'passed' : 'failed';
      
      // Build failed tests list
      const failedTests: string[] = [];
      
      if (missingTables.length > 0) {
        failedTests.push('missingTables');
      }
      
      if (unexpectedTables.length > 0) {
        failedTests.push('unexpectedTables');
      }
      
      columnTests.forEach(test => {
        if (test.status === 'failed') {
          failedTests.push(`columnMismatch:${test.tableName}`);
        }
      });
      
      const results = {
        status,
        results: {
          expectedTables: {
            count: expectedTables.length,
            names: expectedTables
          },
          actualTables: {
            count: tables.length,
            names: tables
          },
          missingTables,
          unexpectedTables,
          columnTests
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing table structure', { error });
      return sendError(res, "Error testing table structure", 500);
    }
  });
  
  // Test data integrity constraints
  app.get("/api/db-test/data-integrity", dbTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running data integrity tests');
      
      const client = await pool.connect();
      let foreignKeyConstraints: any[] = [];
      let uniqueConstraints: any[] = [];
      let nullConstraints: any[] = [];
      
      try {
        // Get foreign key constraints
        const fkQuery = await client.query(`
          SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
        `);
        
        foreignKeyConstraints = fkQuery.rows;
        
        // Get unique constraints
        const uniqueQuery = await client.query(`
          SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name
          FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'UNIQUE'
            AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name;
        `);
        
        uniqueConstraints = uniqueQuery.rows;
        
        // Get not null constraints
        const nullQuery = await client.query(`
          SELECT
            table_name,
            column_name
          FROM
            information_schema.columns
          WHERE
            table_schema = 'public'
            AND is_nullable = 'NO'
            AND column_default IS NULL
          ORDER BY table_name, column_name;
        `);
        
        nullConstraints = nullQuery.rows;
      } finally {
        client.release();
      }
      
      // Test integrity violations - orphaned foreign keys
      const orphanedRecordsTests = await Promise.all(
        foreignKeyConstraints.map(async (fk) => {
          try {
            // Check for orphaned foreign keys
            const testQuery = await db.execute(sql`
              SELECT COUNT(*) as orphaned_count
              FROM ${sql.identifier(fk.table_name)} child
              LEFT JOIN ${sql.identifier(fk.foreign_table_name)} parent
                ON child.${sql.identifier(fk.column_name)} = parent.${sql.identifier(fk.foreign_column_name)}
              WHERE child.${sql.identifier(fk.column_name)} IS NOT NULL
                AND parent.${sql.identifier(fk.foreign_column_name)} IS NULL
            `);
            
            const orphanedCount = parseInt(testQuery[0]?.orphaned_count?.toString() || '0', 10);
            
            return {
              constraint: fk.constraint_name,
              table: fk.table_name,
              column: fk.column_name,
              referencedTable: fk.foreign_table_name,
              referencedColumn: fk.foreign_column_name,
              status: orphanedCount === 0 ? 'passed' : 'failed',
              message: orphanedCount === 0 ? 
                'No orphaned foreign keys found' : 
                `Found ${orphanedCount} orphaned foreign key references`,
              orphanedCount
            };
          } catch (error) {
            logger.error(`Error testing foreign key ${fk.constraint_name}`, { error });
            return {
              constraint: fk.constraint_name,
              table: fk.table_name,
              column: fk.column_name,
              referencedTable: fk.foreign_table_name,
              referencedColumn: fk.foreign_column_name,
              status: 'failed',
              message: 'Error testing foreign key constraint',
              error: String(error)
            };
          }
        })
      );
      
      // Test unique constraints - duplicate values
      const uniqueConstraintTests = await Promise.all(
        uniqueConstraints.map(async (constraint) => {
          try {
            // Check for duplicate values in the unique column
            const testQuery = await db.execute(sql`
              SELECT ${sql.identifier(constraint.column_name)}, COUNT(*)
              FROM ${sql.identifier(constraint.table_name)}
              GROUP BY ${sql.identifier(constraint.column_name)}
              HAVING COUNT(*) > 1
            `);
            
            const duplicateCount = Array.isArray(testQuery) ? testQuery.length : 0;
            
            return {
              constraint: constraint.constraint_name,
              table: constraint.table_name,
              column: constraint.column_name,
              status: duplicateCount === 0 ? 'passed' : 'failed',
              message: duplicateCount === 0 ? 
                'No duplicate values found' : 
                `Found ${duplicateCount} groups of duplicate values`,
              duplicateCount
            };
          } catch (error) {
            logger.error(`Error testing unique constraint ${constraint.constraint_name}`, { error });
            return {
              constraint: constraint.constraint_name,
              table: constraint.table_name,
              column: constraint.column_name,
              status: 'failed',
              message: 'Error testing unique constraint',
              error: String(error)
            };
          }
        })
      );
      
      // Calculate overall status
      const orphanedTestsPassed = orphanedRecordsTests.every(test => test.status === 'passed');
      const uniqueTestsPassed = uniqueConstraintTests.every(test => test.status === 'passed');
      const status = orphanedTestsPassed && uniqueTestsPassed ? 'passed' : 'failed';
      
      // Build failed tests list
      const failedTests: string[] = [];
      
      orphanedRecordsTests.forEach(test => {
        if (test.status === 'failed') {
          failedTests.push(`orphanedForeignKey:${test.table}.${test.column}`);
        }
      });
      
      uniqueConstraintTests.forEach(test => {
        if (test.status === 'failed') {
          failedTests.push(`uniqueConstraint:${test.table}.${test.column}`);
        }
      });
      
      const results = {
        status,
        results: {
          foreignKeyConstraints: {
            count: foreignKeyConstraints.length,
            tests: orphanedRecordsTests
          },
          uniqueConstraints: {
            count: uniqueConstraints.length,
            tests: uniqueConstraintTests
          },
          notNullConstraints: {
            count: nullConstraints.length
          }
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing data integrity', { error });
      return sendError(res, "Error testing data integrity", 500);
    }
  });
  
  // Test query performance using actual application queries
  app.get("/api/db-test/query-performance", dbTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running query performance tests');
      
      const performanceResults = [];
      
      // Test getUser query performance (actual application query)
      const userStartTime = Date.now();
      await storage.getUser(1);
      const userElapsedTime = Date.now() - userStartTime;
      
      performanceResults.push({
        query: 'getUser',
        elapsedTime: userElapsedTime,
        status: userElapsedTime < 100 ? 'passed' : userElapsedTime < 500 ? 'warning' : 'failed',
        message: `getUser query took ${userElapsedTime}ms`
      });
      
      // Test getAllCategories query performance (actual application query)
      const categoriesStartTime = Date.now();
      await storage.getAllCategories();
      const categoriesElapsedTime = Date.now() - categoriesStartTime;
      
      performanceResults.push({
        query: 'getAllCategories',
        elapsedTime: categoriesElapsedTime,
        status: categoriesElapsedTime < 100 ? 'passed' : categoriesElapsedTime < 500 ? 'warning' : 'failed',
        message: `getAllCategories query took ${categoriesElapsedTime}ms`
      });
      
      // Test getMainCategoriesWithChildren (complex query with joins)
      const complexStartTime = Date.now();
      await storage.getMainCategoriesWithChildren();
      const complexElapsedTime = Date.now() - complexStartTime;
      
      performanceResults.push({
        query: 'getMainCategoriesWithChildren',
        elapsedTime: complexElapsedTime,
        status: complexElapsedTime < 200 ? 'passed' : complexElapsedTime < 1000 ? 'warning' : 'failed',
        message: `getMainCategoriesWithChildren query took ${complexElapsedTime}ms`
      });
      
      // Test large table operations if we have products
      try {
        // Get product count first to avoid unnecessary tests
        const client = await pool.connect();
        let productCount = 0;
        
        try {
          const countQuery = await client.query("SELECT COUNT(*) FROM products");
          productCount = parseInt(countQuery.rows[0].count, 10);
        } finally {
          client.release();
        }
        
        if (productCount > 0) {
          // Test product listing query (potentially a large table with many columns)
          const productsStartTime = Date.now();
          await db.query.products.findMany({
            limit: 20,
            offset: 0,
            orderBy: (products, { desc }) => [desc(products.createdAt)],
            with: {
              category: true,
              images: {
                limit: 1,
                where: (images, { eq }) => eq(images.isMain, true)
              }
            }
          });
          const productsElapsedTime = Date.now() - productsStartTime;
          
          performanceResults.push({
            query: 'productListing',
            elapsedTime: productsElapsedTime,
            status: productsElapsedTime < 200 ? 'passed' : productsElapsedTime < 1000 ? 'warning' : 'failed',
            message: `Product listing query took ${productsElapsedTime}ms`
          });
        }
      } catch (error) {
        logger.error('Error during product performance test', { error });
        performanceResults.push({
          query: 'productListing',
          status: 'failed',
          message: 'Error executing product listing query',
          error: String(error)
        });
      }
      
      // Calculate overall status
      const status = performanceResults.every(test => test.status === 'passed') ? 'passed' : 
                     performanceResults.some(test => test.status === 'failed') ? 'failed' : 'warning';
      
      // Build failed tests list
      const failedTests = performanceResults
        .filter(test => test.status === 'failed')
        .map(test => `queryPerformance:${test.query}`);
      
      const results = {
        status,
        results: {
          performanceTests: performanceResults
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing query performance', { error });
      return sendError(res, "Error testing query performance", 500);
    }
  });
  
  // Test index effectiveness
  app.get("/api/db-test/index-effectiveness", dbTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running index effectiveness tests');
      
      const client = await pool.connect();
      let indexes: any[] = [];
      
      try {
        // Get all indexes from the database
        const indexQuery = await client.query(`
          SELECT
            tablename,
            indexname,
            indexdef
          FROM
            pg_indexes
          WHERE
            schemaname = 'public'
          ORDER BY
            tablename,
            indexname;
        `);
        
        indexes = indexQuery.rows;
      } finally {
        client.release();
      }
      
      // Test key indexes we expect to have in our application
      const expectedIndexes = [
        { table: 'users', column: 'username', type: 'UNIQUE', purpose: 'User lookup by username' },
        { table: 'users', column: 'email', type: 'UNIQUE', purpose: 'User lookup by email' },
        { table: 'categories', column: 'slug', type: 'UNIQUE', purpose: 'Category lookup by slug' },
        { table: 'products', column: 'slug', type: 'UNIQUE', purpose: 'Product lookup by slug' },
        { table: 'products', column: 'categoryId', type: 'INDEX', purpose: 'Filter products by category' },
        { table: 'product_images', column: 'productId', type: 'INDEX', purpose: 'Get images for a product' },
      ];
      
      // Check if each expected index exists
      const indexTests = expectedIndexes.map(expected => {
        const indexName = expected.type === 'UNIQUE' ?
          `${expected.table}_${expected.column}_key` :
          `${expected.table}_${expected.column}_idx`;
          
        const indexExists = indexes.some(idx => 
          idx.tablename === expected.table && 
          (idx.indexname === indexName || idx.indexdef.includes(`(${expected.column})`))
        );
        
        return {
          table: expected.table,
          column: expected.column,
          expectedType: expected.type,
          purpose: expected.purpose,
          exists: indexExists,
          status: indexExists ? 'passed' : 'failed',
          message: indexExists ? 
            `Index on ${expected.table}.${expected.column} exists` : 
            `Missing expected index on ${expected.table}.${expected.column}`
        };
      });
      
      // Check index usage statistics if statspack extension is available
      let indexUsageStats = [];
      try {
        // Check if pg_stat_statements extension is available
        const extensionCheckQuery = await client.query(`
          SELECT COUNT(*) AS count FROM pg_extension WHERE extname = 'pg_stat_statements'
        `);
        
        const hasStatsExtension = parseInt(extensionCheckQuery.rows[0].count, 10) > 0;
        
        if (hasStatsExtension) {
          // Get index usage statistics
          const usageQuery = await client.query(`
            SELECT
              schemaname,
              relname as table_name,
              indexrelname as index_name,
              idx_scan as index_scans,
              idx_tup_read as tuples_read,
              idx_tup_fetch as tuples_fetched
            FROM
              pg_stat_user_indexes
            WHERE
              schemaname = 'public'
            ORDER BY
              idx_scan DESC,
              relname ASC;
          `);
          
          indexUsageStats = usageQuery.rows;
        }
      } catch (error) {
        logger.warn('Unable to get index usage statistics', { error });
      }
      
      // Calculate overall status
      const status = indexTests.every(test => test.status === 'passed') ? 'passed' : 'failed';
      
      // Build failed tests list
      const failedTests = indexTests
        .filter(test => test.status === 'failed')
        .map(test => `missingIndex:${test.table}.${test.column}`);
      
      const results = {
        status,
        results: {
          totalIndexes: indexes.length,
          applicationIndexes: indexTests,
          indexUsageStats: indexUsageStats.length > 0 ? indexUsageStats : 'Statistics extension not available'
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing index effectiveness', { error });
      return sendError(res, "Error testing index effectiveness", 500);
    }
  });
  
  // Test transaction functionality
  app.get("/api/db-test/transactions", dbTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running transaction tests');
      
      // Test transaction isolation using the real database connection
      const client = await pool.connect();
      let transactionTestResults = [];
      
      try {
        // Start a transaction
        await client.query('BEGIN');
        
        // Insert a temporary record
        await client.query(`
          CREATE TEMPORARY TABLE IF NOT EXISTS transaction_test (
            id SERIAL PRIMARY KEY,
            test_value TEXT NOT NULL
          )
        `);
        
        // Test 1: Basic transaction commit
        let basicTestPassed = false;
        try {
          // Begin a nested transaction
          await client.query('SAVEPOINT test_point_1');
          
          // Insert data
          await client.query(`
            INSERT INTO transaction_test (test_value) VALUES ('test-commit')
          `);
          
          // Commit the transaction
          await client.query('RELEASE SAVEPOINT test_point_1');
          
          // Verify the data was committed
          const verifyQuery = await client.query(`
            SELECT COUNT(*) FROM transaction_test WHERE test_value = 'test-commit'
          `);
          
          basicTestPassed = parseInt(verifyQuery.rows[0].count, 10) > 0;
        } catch (error) {
          logger.error('Error during basic transaction test', { error });
          await client.query('ROLLBACK TO SAVEPOINT test_point_1');
        }
        
        transactionTestResults.push({
          test: 'basicCommit',
          status: basicTestPassed ? 'passed' : 'failed',
          message: basicTestPassed ? 
            'Transaction commit works correctly' : 
            'Transaction commit failed'
        });
        
        // Test 2: Transaction rollback
        let rollbackTestPassed = false;
        try {
          // Begin a nested transaction
          await client.query('SAVEPOINT test_point_2');
          
          // Insert data
          await client.query(`
            INSERT INTO transaction_test (test_value) VALUES ('test-rollback')
          `);
          
          // Get the count before rollback
          const beforeQuery = await client.query(`
            SELECT COUNT(*) FROM transaction_test WHERE test_value = 'test-rollback'
          `);
          const beforeCount = parseInt(beforeQuery.rows[0].count, 10);
          
          // Rollback the transaction
          await client.query('ROLLBACK TO SAVEPOINT test_point_2');
          
          // Verify the data was not committed
          const afterQuery = await client.query(`
            SELECT COUNT(*) FROM transaction_test WHERE test_value = 'test-rollback'
          `);
          const afterCount = parseInt(afterQuery.rows[0].count, 10);
          
          rollbackTestPassed = beforeCount > 0 && afterCount === 0;
        } catch (error) {
          logger.error('Error during rollback transaction test', { error });
        }
        
        transactionTestResults.push({
          test: 'rollback',
          status: rollbackTestPassed ? 'passed' : 'failed',
          message: rollbackTestPassed ? 
            'Transaction rollback works correctly' : 
            'Transaction rollback failed'
        });
        
        // Test 3: Test READ COMMITTED isolation level (default in PostgreSQL)
        let isolationTestPassed = false;
        try {
          // Begin a nested transaction with explicit isolation level
          await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
          await client.query('SAVEPOINT test_point_3');
          
          // Insert data
          await client.query(`
            INSERT INTO transaction_test (test_value) VALUES ('test-isolation')
          `);
          
          // Check isolation level
          const isolationQuery = await client.query(`SHOW transaction_isolation`);
          const isolationLevel = isolationQuery.rows[0].transaction_isolation;
          
          isolationTestPassed = isolationLevel === 'read committed';
          
          // Clean up
          await client.query('ROLLBACK TO SAVEPOINT test_point_3');
        } catch (error) {
          logger.error('Error during isolation level test', { error });
          await client.query('ROLLBACK TO SAVEPOINT test_point_3');
        }
        
        transactionTestResults.push({
          test: 'isolationLevel',
          status: isolationTestPassed ? 'passed' : 'failed',
          message: isolationTestPassed ? 
            'Transaction isolation level is correctly set to READ COMMITTED' : 
            'Transaction isolation level test failed'
        });
        
        // Finish the transaction
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
      
      // Calculate overall status
      const status = transactionTestResults.every(test => test.status === 'passed') ? 'passed' : 'failed';
      
      // Build failed tests list
      const failedTests = transactionTestResults
        .filter(test => test.status === 'failed')
        .map(test => `transaction:${test.test}`);
      
      const results = {
        status,
        results: {
          transactionTests: transactionTestResults
        },
        failedTests
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error testing transactions', { error });
      return sendError(res, "Error testing transactions", 500);
    }
  });
  
  // Run all database tests
  app.post("/api/db-test/run-all", dbTestAdminCheck, async (req: Request, res: Response) => {
    try {
      logger.info('Running all database tests');
      
      // Call all test endpoints and aggregate results
      const structureResponse = await fetch(`${req.protocol}://${req.get('host')}/api/db-test/table-structure`);
      const structureResults = await structureResponse.json();
      
      const integrityResponse = await fetch(`${req.protocol}://${req.get('host')}/api/db-test/data-integrity`);
      const integrityResults = await integrityResponse.json();
      
      const performanceResponse = await fetch(`${req.protocol}://${req.get('host')}/api/db-test/query-performance`);
      const performanceResults = await performanceResponse.json();
      
      const indexResponse = await fetch(`${req.protocol}://${req.get('host')}/api/db-test/index-effectiveness`);
      const indexResults = await indexResponse.json();
      
      const transactionResponse = await fetch(`${req.protocol}://${req.get('host')}/api/db-test/transactions`);
      const transactionResults = await transactionResponse.json();
      
      // Calculate overall status
      const allTests = [
        structureResults,
        integrityResults,
        performanceResults,
        indexResults,
        transactionResults
      ];
      
      const status = allTests.every(test => test.data.status === 'passed') ? 'passed' : 'failed';
      
      // Combine all failed tests
      const failedTests = allTests.flatMap(test => 
        test.data.failedTests.map((failedTest: string) => 
          test.data.status === 'failed' ? failedTest : null
        ).filter(Boolean)
      );
      
      const results = {
        status,
        results: {
          tableStructure: structureResults.data,
          dataIntegrity: integrityResults.data,
          queryPerformance: performanceResults.data,
          indexEffectiveness: indexResults.data,
          transactions: transactionResults.data
        },
        failedTests,
        summary: {
          totalTests: allTests.length,
          passedTests: allTests.filter(test => test.data.status === 'passed').length,
          failedTests: allTests.filter(test => test.data.status === 'failed').length
        }
      };
      
      return sendSuccess(res, results);
    } catch (error) {
      logger.error('Error running all database tests', { error });
      return sendError(res, "Error running all database tests", 500);
    }
  });
}