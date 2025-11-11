import { eq, and } from "drizzle-orm";
import {
  shippingMethods,
  supplierShippingMethods,
  orderShipments,
  type ShippingMethod,
  type InsertShippingMethod
} from "@shared/schema";
import { BaseRepository } from "./base-repository";

export class ShippingMethodRepository extends BaseRepository {
  async getShippingMethod(id: number): Promise<ShippingMethod | undefined> {
    try {
      const [method] = await this.db
        .select()
        .from(shippingMethods)
        .where(eq(shippingMethods.id, id))
        .limit(1);
      return method;
    } catch (error) {
      return this.handleError(`getShippingMethod(${id})`, error);
    }
  }

  async getShippingMethodsByCompany(
    companyId: number,
    includeInactive = false
  ): Promise<ShippingMethod[]> {
    try {
      const conditions = [eq(shippingMethods.companyId, companyId)];
      if (!includeInactive) {
        conditions.push(eq(shippingMethods.isActive, true));
      }

      return await this.db
        .select()
        .from(shippingMethods)
        .where(and(...conditions));
    } catch (error) {
      return this.handleError(`getShippingMethodsByCompany(${companyId})`, error);
    }
  }

  async getAllShippingMethods(includeInactive = false): Promise<ShippingMethod[]> {
    try {
      let query = this.db.select().from(shippingMethods);
      
      if (!includeInactive) {
        query = query.where(eq(shippingMethods.isActive, true));
      }
      
      return await query;
    } catch (error) {
      return this.handleError("getAllShippingMethods", error);
    }
  }

  async createShippingMethod(data: InsertShippingMethod): Promise<ShippingMethod> {
    try {
      const [method] = await this.db
        .insert(shippingMethods)
        .values({
          ...data,
          createdAt: this.getCurrentTimestamp(),
          updatedAt: this.getCurrentTimestamp(),
        })
        .returning();
      return method;
    } catch (error) {
      return this.handleError("createShippingMethod", error);
    }
  }

  async updateShippingMethod(
    id: number,
    data: Partial<InsertShippingMethod>
  ): Promise<ShippingMethod | undefined> {
    try {
      const [updated] = await this.db
        .update(shippingMethods)
        .set({
          ...data,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(shippingMethods.id, id))
        .returning();
      return updated;
    } catch (error) {
      return this.handleError(`updateShippingMethod(${id})`, error);
    }
  }

  async deleteShippingMethod(id: number): Promise<boolean> {
    try {
      const [updated] = await this.db
        .update(shippingMethods)
        .set({
          isActive: false,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(shippingMethods.id, id))
        .returning();
      return !!updated;
    } catch (error) {
      return this.handleError(`deleteShippingMethod(${id})`, error);
    }
  }

  async validateShippingMethodNotInUse(id: number): Promise<boolean> {
    try {
      const [supplierUse] = await this.db
        .select()
        .from(supplierShippingMethods)
        .where(eq(supplierShippingMethods.methodId, id))
        .limit(1);

      if (supplierUse) return false;

      const [shipmentUse] = await this.db
        .select()
        .from(orderShipments)
        .where(eq(orderShipments.methodId, id))
        .limit(1);

      return !shipmentUse;
    } catch (error) {
      return this.handleError(`validateShippingMethodNotInUse(${id})`, error);
    }
  }
}
