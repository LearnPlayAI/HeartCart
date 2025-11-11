import { eq, and, inArray } from "drizzle-orm";
import {
  products,
  suppliers,
  supplierShippingMethods,
  shippingMethods,
  type CartItem,
  type Supplier,
  type ShippingMethod
} from "@shared/schema";
import { BaseRepository } from "./base-repository";

export class ShippingAnalysisRepository extends BaseRepository {
  async analyzeCartShipping(cartItems: CartItem[]): Promise<{
    groupedBySupplier: Array<{
      supplierId: number;
      supplier: Supplier;
      items: CartItem[];
      availableMethods: ShippingMethod[];
      defaultMethod: ShippingMethod | null;
    }>;
    totalShippingCost: number;
    validationErrors: string[];
  }> {
    try {
      const validationErrors: string[] = [];
      
      if (cartItems.length === 0) {
        return { groupedBySupplier: [], totalShippingCost: 0, validationErrors: [] };
      }

      const productIds = cartItems.map(item => item.productId);
      const productsData = await this.db
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      const productMap = new Map(productsData.map(p => [p.id, p]));

      const groupedMap = new Map<number, { supplier: Supplier; items: CartItem[] }>();

      for (const item of cartItems) {
        const product = productMap.get(item.productId);
        if (!product || !product.supplierId) {
          validationErrors.push(`Product ${item.productId} has no supplier assigned`);
          continue;
        }

        if (!groupedMap.has(product.supplierId)) {
          const [supplier] = await this.db
            .select()
            .from(suppliers)
            .where(eq(suppliers.id, product.supplierId))
            .limit(1);

          if (!supplier) {
            validationErrors.push(`Supplier ${product.supplierId} not found`);
            continue;
          }

          groupedMap.set(product.supplierId, { supplier, items: [] });
        }

        groupedMap.get(product.supplierId)!.items.push(item);
      }

      const groupedBySupplier = await Promise.all(
        Array.from(groupedMap.entries()).map(async ([supplierId, { supplier, items }]) => {
          const availableMethods = await this.getApplicableShippingMethods(supplierId);
          const defaultMethod = availableMethods.find(m => 
            m.isDefault && m.isEnabled
          ) || availableMethods[0] || null;

          if (availableMethods.length === 0) {
            validationErrors.push(`Supplier ${supplier.name} has no shipping methods configured`);
          }

          return {
            supplierId,
            supplier,
            items,
            availableMethods: availableMethods.map(m => m.method),
            defaultMethod: defaultMethod?.method || null
          };
        })
      );

      let totalShippingCost = 0;
      for (const group of groupedBySupplier) {
        if (group.defaultMethod) {
          const cost = parseFloat(group.defaultMethod.basePrice || '0');
          totalShippingCost += cost;
        }
      }

      return { groupedBySupplier, totalShippingCost, validationErrors };
    } catch (error) {
      return this.handleError("analyzeCartShipping", error);
    }
  }

  async calculateShippingForSelection(
    cartItems: CartItem[],
    methodSelections: Record<number, number>
  ): Promise<{
    totalCost: number;
    breakdown: Array<{ supplierId: number; methodId: number; cost: number; itemCount: number }>;
  }> {
    try {
      const productIds = cartItems.map(item => item.productId);
      const productsData = await this.db
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      const productMap = new Map(productsData.map(p => [p.id, p]));
      const supplierItemCounts = new Map<number, number>();

      for (const item of cartItems) {
        const product = productMap.get(item.productId);
        if (!product || !product.supplierId) continue;

        supplierItemCounts.set(
          product.supplierId,
          (supplierItemCounts.get(product.supplierId) || 0) + 1
        );
      }

      const breakdown: Array<{ supplierId: number; methodId: number; cost: number; itemCount: number }> = [];
      let totalCost = 0;

      for (const [supplierId, itemCount] of supplierItemCounts.entries()) {
        const methodId = methodSelections[supplierId];
        if (!methodId) continue;

        const [assignment] = await this.db
          .select()
          .from(supplierShippingMethods)
          .innerJoin(shippingMethods, eq(supplierShippingMethods.methodId, shippingMethods.id))
          .where(
            and(
              eq(supplierShippingMethods.supplierId, supplierId),
              eq(supplierShippingMethods.methodId, methodId)
            )
          )
          .limit(1);

        if (assignment) {
          const cost = parseFloat(
            assignment.supplierShippingMethods.customPrice || 
            assignment.shippingMethods.basePrice || 
            '0'
          );
          totalCost += cost;
          breakdown.push({ supplierId, methodId, cost, itemCount });
        }
      }

      return { totalCost, breakdown };
    } catch (error) {
      return this.handleError("calculateShippingForSelection", error);
    }
  }

  async validateShippingSelection(
    cartItems: CartItem[],
    methodSelections: Record<number, number>
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      const productIds = cartItems.map(item => item.productId);
      const productsData = await this.db
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      const supplierIds = new Set(
        productsData
          .map(p => p.supplierId)
          .filter((id): id is number => id !== null)
      );

      for (const supplierId of supplierIds) {
        const methodId = methodSelections[supplierId];
        if (!methodId) {
          errors.push(`No shipping method selected for supplier ${supplierId}`);
          continue;
        }

        const [assignment] = await this.db
          .select()
          .from(supplierShippingMethods)
          .where(
            and(
              eq(supplierShippingMethods.supplierId, supplierId),
              eq(supplierShippingMethods.methodId, methodId),
              eq(supplierShippingMethods.isEnabled, true)
            )
          )
          .limit(1);

        if (!assignment) {
          errors.push(`Shipping method ${methodId} not available for supplier ${supplierId}`);
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      return this.handleError("validateShippingSelection", error);
    }
  }

  async getApplicableShippingMethods(
    supplierId: number
  ): Promise<Array<{ method: ShippingMethod; isDefault: boolean; isEnabled: boolean; customPrice: string | null }>> {
    try {
      const results = await this.db
        .select()
        .from(supplierShippingMethods)
        .innerJoin(
          shippingMethods,
          eq(supplierShippingMethods.methodId, shippingMethods.id)
        )
        .where(
          and(
            eq(supplierShippingMethods.supplierId, supplierId),
            eq(supplierShippingMethods.isEnabled, true),
            eq(shippingMethods.isActive, true)
          )
        );

      return results.map(row => ({
        method: row.shippingMethods,
        isDefault: row.supplierShippingMethods.isDefault,
        isEnabled: row.supplierShippingMethods.isEnabled,
        customPrice: row.supplierShippingMethods.customPrice
      }));
    } catch (error) {
      return this.handleError(`getApplicableShippingMethods(${supplierId})`, error);
    }
  }
}
