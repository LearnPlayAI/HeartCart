import { eq } from "drizzle-orm";
import {
  orderShipments,
  suppliers,
  shippingMethods,
  type OrderShipment,
  type InsertOrderShipment,
  type Supplier,
  type ShippingMethod
} from "@shared/schema";
import { BaseRepository } from "./base-repository";

export class OrderShipmentRepository extends BaseRepository {
  async createOrderShipments(
    orderId: number,
    shipments: Array<{
      supplierId: number;
      methodId: number;
      cost: string | number;
      items: any;
      displayLabel: string;
    }>
  ): Promise<OrderShipment[]> {
    try {
      const shipmentsToInsert = shipments.map(s => ({
        orderId,
        supplierId: s.supplierId,
        methodId: s.methodId,
        cost: typeof s.cost === 'string' ? s.cost : s.cost.toFixed(2),
        items: s.items,
        displayLabel: s.displayLabel,
        status: 'pending',
        createdAt: this.getCurrentTimestamp(),
        updatedAt: this.getCurrentTimestamp(),
      }));

      return await this.db
        .insert(orderShipments)
        .values(shipmentsToInsert)
        .returning();
    } catch (error) {
      return this.handleError(`createOrderShipments(orderId: ${orderId})`, error);
    }
  }

  async getOrderShipments(
    orderId: number,
    includeSupplierInfo = false
  ): Promise<(OrderShipment & { supplier?: Supplier; method?: ShippingMethod })[]> {
    try {
      if (!includeSupplierInfo) {
        return await this.db
          .select()
          .from(orderShipments)
          .where(eq(orderShipments.orderId, orderId));
      }

      const results = await this.db
        .select()
        .from(orderShipments)
        .leftJoin(suppliers, eq(orderShipments.supplierId, suppliers.id))
        .leftJoin(shippingMethods, eq(orderShipments.methodId, shippingMethods.id))
        .where(eq(orderShipments.orderId, orderId));

      return results.map(row => ({
        ...row.orderShipments,
        supplier: row.suppliers || undefined,
        method: row.shippingMethods || undefined
      }));
    } catch (error) {
      return this.handleError(`getOrderShipments(${orderId})`, error);
    }
  }

  async getOrderShipment(
    shipmentId: number
  ): Promise<(OrderShipment & { supplier?: Supplier; method?: ShippingMethod }) | undefined> {
    try {
      const [result] = await this.db
        .select()
        .from(orderShipments)
        .leftJoin(suppliers, eq(orderShipments.supplierId, suppliers.id))
        .leftJoin(shippingMethods, eq(orderShipments.methodId, shippingMethods.id))
        .where(eq(orderShipments.id, shipmentId))
        .limit(1);

      if (!result) return undefined;

      return {
        ...result.orderShipments,
        supplier: result.suppliers || undefined,
        method: result.shippingMethods || undefined
      };
    } catch (error) {
      return this.handleError(`getOrderShipment(${shipmentId})`, error);
    }
  }

  async updateShipmentStatus(
    shipmentId: number,
    status: string,
    notes?: string
  ): Promise<OrderShipment | undefined> {
    try {
      const [updated] = await this.db
        .update(orderShipments)
        .set({
          status,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(orderShipments.id, shipmentId))
        .returning();

      return updated;
    } catch (error) {
      return this.handleError(`updateShipmentStatus(${shipmentId})`, error);
    }
  }

  async updateShipmentTracking(
    shipmentId: number,
    trackingNumber: string
  ): Promise<OrderShipment | undefined> {
    try {
      const [updated] = await this.db
        .update(orderShipments)
        .set({
          trackingNumber,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(orderShipments.id, shipmentId))
        .returning();

      return updated;
    } catch (error) {
      return this.handleError(`updateShipmentTracking(${shipmentId})`, error);
    }
  }

  async calculateOrderShippingTotal(orderId: number): Promise<number> {
    try {
      const shipments = await this.db
        .select()
        .from(orderShipments)
        .where(eq(orderShipments.orderId, orderId));

      return shipments.reduce((total, shipment) => {
        const cost = parseFloat(shipment.cost || '0');
        return total + cost;
      }, 0);
    } catch (error) {
      return this.handleError(`calculateOrderShippingTotal(${orderId})`, error);
    }
  }

  async getShipmentItems(shipmentId: number): Promise<any> {
    try {
      const [shipment] = await this.db
        .select()
        .from(orderShipments)
        .where(eq(orderShipments.id, shipmentId))
        .limit(1);

      return shipment?.items || null;
    } catch (error) {
      return this.handleError(`getShipmentItems(${shipmentId})`, error);
    }
  }

  async updateShipmentDeliveredAt(
    shipmentId: number,
    deliveredAt: string
  ): Promise<OrderShipment | undefined> {
    try {
      const [updated] = await this.db
        .update(orderShipments)
        .set({
          status: 'delivered',
          deliveredAt,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(orderShipments.id, shipmentId))
        .returning();

      return updated;
    } catch (error) {
      return this.handleError(`updateShipmentDeliveredAt(${shipmentId})`, error);
    }
  }
}
