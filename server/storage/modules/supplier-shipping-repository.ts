import { eq, and } from "drizzle-orm";
import {
  supplierShippingMethods,
  shippingMethods,
  type SupplierShippingMethod,
  type InsertSupplierShippingMethod,
  type ShippingMethod
} from "@shared/schema";
import { BaseRepository } from "./base-repository";

export class SupplierShippingRepository extends BaseRepository {
  async getSupplierShippingMethods(
    supplierId: number
  ): Promise<(SupplierShippingMethod & { method: ShippingMethod })[]> {
    try {
      const results = await this.db
        .select()
        .from(supplierShippingMethods)
        .innerJoin(
          shippingMethods,
          eq(supplierShippingMethods.methodId, shippingMethods.id)
        )
        .where(eq(supplierShippingMethods.supplierId, supplierId));

      return results.map(row => ({
        ...row.supplierShippingMethods,
        method: row.shippingMethods
      }));
    } catch (error) {
      return this.handleError(`getSupplierShippingMethods(${supplierId})`, error);
    }
  }

  async assignShippingMethodToSupplier(
    supplierId: number,
    methodId: number,
    data: Partial<InsertSupplierShippingMethod>
  ): Promise<SupplierShippingMethod> {
    try {
      const [assignment] = await this.db
        .insert(supplierShippingMethods)
        .values({
          supplierId,
          methodId,
          ...data,
          createdAt: this.getCurrentTimestamp(),
          updatedAt: this.getCurrentTimestamp(),
        })
        .returning();
      return assignment;
    } catch (error) {
      return this.handleError(`assignShippingMethodToSupplier(${supplierId}, ${methodId})`, error);
    }
  }

  async updateSupplierShippingMethod(
    supplierId: number,
    methodId: number,
    data: Partial<InsertSupplierShippingMethod>
  ): Promise<SupplierShippingMethod | undefined> {
    try {
      const [updated] = await this.db
        .update(supplierShippingMethods)
        .set({
          ...data,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(
          and(
            eq(supplierShippingMethods.supplierId, supplierId),
            eq(supplierShippingMethods.methodId, methodId)
          )
        )
        .returning();
      return updated;
    } catch (error) {
      return this.handleError(`updateSupplierShippingMethod(${supplierId}, ${methodId})`, error);
    }
  }

  async removeShippingMethodFromSupplier(
    supplierId: number,
    methodId: number
  ): Promise<boolean> {
    try {
      await this.db
        .delete(supplierShippingMethods)
        .where(
          and(
            eq(supplierShippingMethods.supplierId, supplierId),
            eq(supplierShippingMethods.methodId, methodId)
          )
        );
      return true;
    } catch (error) {
      return this.handleError(`removeShippingMethodFromSupplier(${supplierId}, ${methodId})`, error);
    }
  }

  async setDefaultShippingMethod(
    supplierId: number,
    methodId: number
  ): Promise<boolean> {
    try {
      await this.db
        .update(supplierShippingMethods)
        .set({ isDefault: false })
        .where(eq(supplierShippingMethods.supplierId, supplierId));

      await this.db
        .update(supplierShippingMethods)
        .set({
          isDefault: true,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(
          and(
            eq(supplierShippingMethods.supplierId, supplierId),
            eq(supplierShippingMethods.methodId, methodId)
          )
        );

      return true;
    } catch (error) {
      return this.handleError(`setDefaultShippingMethod(${supplierId}, ${methodId})`, error);
    }
  }

  async validateSupplierHasShippingMethods(supplierId: number): Promise<boolean> {
    try {
      const [method] = await this.db
        .select()
        .from(supplierShippingMethods)
        .where(
          and(
            eq(supplierShippingMethods.supplierId, supplierId),
            eq(supplierShippingMethods.isEnabled, true)
          )
        )
        .limit(1);

      return !!method;
    } catch (error) {
      return this.handleError(`validateSupplierHasShippingMethods(${supplierId})`, error);
    }
  }
}
