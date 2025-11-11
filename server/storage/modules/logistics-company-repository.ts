import { eq } from "drizzle-orm";
import { 
  logisticsCompanies,
  shippingMethods,
  type LogisticsCompany,
  type InsertLogisticsCompany,
  type ShippingMethod
} from "@shared/schema";
import { BaseRepository } from "./base-repository";

export class LogisticsCompanyRepository extends BaseRepository {
  async getLogisticsCompany(id: number): Promise<LogisticsCompany | undefined> {
    try {
      const [company] = await this.db
        .select()
        .from(logisticsCompanies)
        .where(eq(logisticsCompanies.id, id))
        .limit(1);
      return company;
    } catch (error) {
      return this.handleError(`getLogisticsCompany(${id})`, error);
    }
  }

  async getAllLogisticsCompanies(includeInactive = false): Promise<LogisticsCompany[]> {
    try {
      let query = this.db.select().from(logisticsCompanies);
      
      if (!includeInactive) {
        query = query.where(eq(logisticsCompanies.isActive, true));
      }
      
      return await query;
    } catch (error) {
      return this.handleError("getAllLogisticsCompanies", error);
    }
  }

  async createLogisticsCompany(data: InsertLogisticsCompany): Promise<LogisticsCompany> {
    try {
      const [company] = await this.db
        .insert(logisticsCompanies)
        .values({
          ...data,
          createdAt: this.getCurrentTimestamp(),
          updatedAt: this.getCurrentTimestamp(),
        })
        .returning();
      return company;
    } catch (error) {
      return this.handleError("createLogisticsCompany", error);
    }
  }

  async updateLogisticsCompany(
    id: number,
    data: Partial<InsertLogisticsCompany>
  ): Promise<LogisticsCompany | undefined> {
    try {
      const [updated] = await this.db
        .update(logisticsCompanies)
        .set({
          ...data,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(logisticsCompanies.id, id))
        .returning();
      return updated;
    } catch (error) {
      return this.handleError(`updateLogisticsCompany(${id})`, error);
    }
  }

  async deleteLogisticsCompany(id: number): Promise<boolean> {
    try {
      const [updated] = await this.db
        .update(logisticsCompanies)
        .set({
          isActive: false,
          updatedAt: this.getCurrentTimestamp(),
        })
        .where(eq(logisticsCompanies.id, id))
        .returning();
      return !!updated;
    } catch (error) {
      return this.handleError(`deleteLogisticsCompany(${id})`, error);
    }
  }

  async getLogisticsCompanyWithMethods(
    id: number
  ): Promise<(LogisticsCompany & { methods: ShippingMethod[] }) | undefined> {
    try {
      const company = await this.getLogisticsCompany(id);
      if (!company) return undefined;

      const methods = await this.db
        .select()
        .from(shippingMethods)
        .where(eq(shippingMethods.companyId, id));

      return { ...company, methods };
    } catch (error) {
      return this.handleError(`getLogisticsCompanyWithMethods(${id})`, error);
    }
  }
}
