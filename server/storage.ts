import {
  users,
  type User,
  type InsertUser,
  categories,
  type Category,
  type InsertCategory,
  products,
  type Product,
  type InsertProduct,
  cartItems,
  type CartItem,
  type InsertCartItem,
  orders,
  type Order,
  type InsertOrder,
  orderItems,
  type OrderItem,
  type InsertOrderItem,
  productImages,
  type ProductImage,
  type InsertProductImage,
  aiRecommendations,
  type AiRecommendation,
  type InsertAiRecommendation,
  pricing,
  type Pricing,
  type InsertPricing,
  aiSettings,
  type AiSetting,
  type InsertAiSetting,
  suppliers,
  type Supplier,
  type InsertSupplier,
  catalogs,
  type Catalog,
  type InsertCatalog,
  productDrafts,
  type ProductDraft,
  type InsertProductDraft,
  attributes,
  type Attribute,
  type InsertAttribute,
  attributeOptions,
  type AttributeOption,
  type InsertAttributeOption,
  productAttributes,
  type ProductAttribute,
  type InsertProductAttribute,
} from "@shared/schema";

import { db } from "./db";
import { eq, desc, asc, and, or, isNull, sql, inArray, like } from "drizzle-orm";

export class Storage {
  // User operations
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return user || null;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return user || null;
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();
      
      return newUser;
    } catch (error) {
      throw error;
    }
  }

  async getUser(id: number): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user || null;
    } catch (error) {
      throw error;
    }
  }

  // Supplier operations
  async getAllSuppliers(activeOnly = true): Promise<Supplier[]> {
    try {
      if (activeOnly) {
        const allSuppliers = await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.isActive, true))
          .orderBy(asc(suppliers.name));
        return allSuppliers;
      } else {
        const allSuppliers = await db
          .select()
          .from(suppliers)
          .orderBy(asc(suppliers.name));
        return allSuppliers;
      }
    } catch (error) {
      throw error;
    }
  }

  async getSupplierById(id: number): Promise<Supplier | null> {
    try {
      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, id))
        .limit(1);
      
      return supplier || null;
    } catch (error) {
      throw error;
    }
  }

  async createSupplier(supplierData: InsertSupplier): Promise<Supplier> {
    try {
      const [newSupplier] = await db
        .insert(suppliers)
        .values(supplierData)
        .returning();
      
      return newSupplier;
    } catch (error) {
      throw error;
    }
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier> {
    try {
      const [updatedSupplier] = await db
        .update(suppliers)
        .set(supplierData)
        .where(eq(suppliers.id, id))
        .returning();
      
      return updatedSupplier;
    } catch (error) {
      throw error;
    }
  }

  async deleteSupplier(id: number): Promise<void> {
    try {
      await db.delete(suppliers).where(eq(suppliers.id, id));
    } catch (error) {
      throw error;
    }
  }

  // Catalog operations
  async getAllCatalogs(activeOnly = true): Promise<Catalog[]> {
    try {
      if (activeOnly) {
        const allCatalogs = await db
          .select()
          .from(catalogs)
          .where(eq(catalogs.isActive, true))
          .orderBy(asc(catalogs.name));
        return allCatalogs;
      } else {
        const allCatalogs = await db
          .select()
          .from(catalogs)
          .orderBy(asc(catalogs.name));
        return allCatalogs;
      }
    } catch (error) {
      throw error;
    }
  }

  async getCatalogById(id: number): Promise<Catalog | null> {
    try {
      const [catalog] = await db
        .select()
        .from(catalogs)
        .where(eq(catalogs.id, id))
        .limit(1);
      
      return catalog || null;
    } catch (error) {
      throw error;
    }
  }

  async createCatalog(catalogData: InsertCatalog): Promise<Catalog> {
    try {
      const [newCatalog] = await db
        .insert(catalogs)
        .values(catalogData)
        .returning();
      
      return newCatalog;
    } catch (error) {
      throw error;
    }
  }

  async updateCatalog(id: number, catalogData: Partial<InsertCatalog>): Promise<Catalog> {
    try {
      const [updatedCatalog] = await db
        .update(catalogs)
        .set(catalogData)
        .where(eq(catalogs.id, id))
        .returning();
      
      return updatedCatalog;
    } catch (error) {
      throw error;
    }
  }

  async deleteCatalog(id: number): Promise<void> {
    try {
      await db.delete(catalogs).where(eq(catalogs.id, id));
    } catch (error) {
      throw error;
    }
  }

  // Product operations
  async getAllProducts(activeOnly = true): Promise<Product[]> {
    try {
      const productsQuery = db
        .select()
        .from(products)
        .orderBy(asc(products.name));
      
      if (activeOnly) {
        productsQuery.where(eq(products.isActive, true));
      }
      
      const allProducts = await productsQuery;
      return allProducts;
    } catch (error) {
      throw error;
    }
  }

  async getProductById(id: number): Promise<Product | null> {
    try {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);
      
      return product || null;
    } catch (error) {
      throw error;
    }
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    try {
      const [newProduct] = await db
        .insert(products)
        .values(productData)
        .returning();
      
      return newProduct;
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product> {
    try {
      const [updatedProduct] = await db
        .update(products)
        .set(productData)
        .where(eq(products.id, id))
        .returning();
      
      return updatedProduct;
    } catch (error) {
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      await db.delete(products).where(eq(products.id, id));
    } catch (error) {
      throw error;
    }
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    try {
      const allCategories = await db
        .select()
        .from(categories)
        .orderBy(asc(categories.name));
      
      return allCategories;
    } catch (error) {
      throw error;
    }
  }

  async getCategoryById(id: number): Promise<Category | null> {
    try {
      const [category] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);
      
      return category || null;
    } catch (error) {
      throw error;
    }
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    try {
      const [newCategory] = await db
        .insert(categories)
        .values(categoryData)
        .returning();
      
      return newCategory;
    } catch (error) {
      throw error;
    }
  }
}

export const storage = new Storage();