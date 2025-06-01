/**
 * Promotion Scheduler Service
 * 
 * Handles automatic activation and deactivation of promotions based on their scheduled times.
 * Includes South African timezone handling and background job processing.
 */

import { storage } from './storage';
import type { Promotion } from '../shared/schema';

interface ScheduledTask {
  promotionId: number;
  action: 'activate' | 'deactivate';
  scheduledTime: Date;
  executed: boolean;
}

class PromotionScheduler {
  private tasks: ScheduledTask[] = [];
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly SOUTH_AFRICA_TIMEZONE = 'Africa/Johannesburg';
  private readonly CHECK_INTERVAL = 60000; // Check every minute

  /**
   * Start the promotion scheduler
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    console.log('🕒 Starting promotion scheduler...');
    this.isRunning = true;
    
    // Load initial scheduled tasks
    this.loadScheduledTasks();
    
    // Start the interval checker
    this.intervalId = setInterval(() => {
      this.processPendingTasks();
    }, this.CHECK_INTERVAL);
    
    console.log('✅ Promotion scheduler started successfully');
  }

  /**
   * Stop the promotion scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping promotion scheduler...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('✅ Promotion scheduler stopped');
  }

  /**
   * Load scheduled tasks from the database
   */
  private async loadScheduledTasks(): Promise<void> {
    try {
      const promotions = await storage.getPromotions();
      const now = this.getCurrentSouthAfricaTime();
      
      this.tasks = [];
      
      for (const promotion of promotions) {
        const startDate = this.parseDateInSouthAfricaTime(promotion.startDate);
        const endDate = this.parseDateInSouthAfricaTime(promotion.endDate);
        
        // Schedule activation if not yet started
        if (startDate > now && !promotion.isActive) {
          this.tasks.push({
            promotionId: promotion.id,
            action: 'activate',
            scheduledTime: startDate,
            executed: false
          });
        }
        
        // Schedule deactivation if not yet ended
        if (endDate > now) {
          this.tasks.push({
            promotionId: promotion.id,
            action: 'deactivate',
            scheduledTime: endDate,
            executed: false
          });
        }
      }
      
      console.log(`📋 Loaded ${this.tasks.length} scheduled promotion tasks`);
    } catch (error) {
      console.error('❌ Error loading scheduled tasks:', error);
    }
  }

  /**
   * Process pending tasks that are due for execution
   */
  private async processPendingTasks(): Promise<void> {
    const now = this.getCurrentSouthAfricaTime();
    const pendingTasks = this.tasks.filter(task => 
      !task.executed && task.scheduledTime <= now
    );
    
    for (const task of pendingTasks) {
      try {
        await this.executeTask(task);
        task.executed = true;
        console.log(`✅ Executed ${task.action} for promotion ${task.promotionId}`);
      } catch (error) {
        console.error(`❌ Failed to execute ${task.action} for promotion ${task.promotionId}:`, error);
      }
    }
    
    // Remove executed tasks
    this.tasks = this.tasks.filter(task => !task.executed);
  }

  /**
   * Execute a scheduled task
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    switch (task.action) {
      case 'activate':
        await this.activatePromotion(task.promotionId);
        break;
      case 'deactivate':
        await this.deactivatePromotion(task.promotionId);
        break;
      default:
        throw new Error(`Unknown task action: ${task.action}`);
    }
  }

  /**
   * Activate a promotion
   */
  private async activatePromotion(promotionId: number): Promise<void> {
    const promotion = await storage.getPromotionById(promotionId);
    if (!promotion) {
      throw new Error(`Promotion ${promotionId} not found`);
    }

    if (promotion.isActive) {
      console.log(`⚠️  Promotion ${promotionId} is already active`);
      return;
    }

    // Check for overlapping promotions
    const conflicts = await this.checkForConflicts(promotionId);
    if (conflicts.length > 0) {
      console.warn(`⚠️  Promotion ${promotionId} has conflicts with active promotions:`, conflicts);
    }

    await storage.updatePromotion(promotionId, { isActive: true });
    console.log(`🎉 Activated promotion: ${promotion.promotionName}`);
  }

  /**
   * Deactivate a promotion
   */
  private async deactivatePromotion(promotionId: number): Promise<void> {
    const promotion = await storage.getPromotionById(promotionId);
    if (!promotion) {
      throw new Error(`Promotion ${promotionId} not found`);
    }

    if (!promotion.isActive) {
      console.log(`⚠️  Promotion ${promotionId} is already inactive`);
      return;
    }

    await storage.updatePromotion(promotionId, { isActive: false });
    console.log(`🏁 Deactivated promotion: ${promotion.promotionName}`);
  }

  /**
   * Check for conflicts with other active promotions
   */
  private async checkForConflicts(promotionId: number): Promise<number[]> {
    try {
      const targetPromotion = await storage.getPromotionById(promotionId);
      if (!targetPromotion) {
        return [];
      }

      const targetProducts = await storage.getPromotionProducts(promotionId);
      const targetProductIds = targetProducts.map(p => p.productId || p.product?.id).filter(Boolean);

      const activePromotions = await storage.getActivePromotions();
      const conflicts: number[] = [];

      for (const activePromotion of activePromotions) {
        if (activePromotion.id === promotionId) {
          continue;
        }

        const activeProducts = await storage.getPromotionProducts(activePromotion.id);
        const activeProductIds = activeProducts.map(p => p.productId || p.product?.id).filter(Boolean);

        // Check for overlapping products
        const overlap = targetProductIds.some(id => activeProductIds.includes(id));
        if (overlap) {
          conflicts.push(activePromotion.id);
        }
      }

      return conflicts;
    } catch (error) {
      console.error(`Error checking conflicts for promotion ${promotionId}:`, error);
      return [];
    }
  }

  /**
   * Add a new promotion to the scheduler
   */
  async schedulePromotion(promotion: Promotion): Promise<void> {
    const now = this.getCurrentSouthAfricaTime();
    const startDate = this.parseDateInSouthAfricaTime(promotion.startDate);
    const endDate = this.parseDateInSouthAfricaTime(promotion.endDate);

    // Schedule activation if in the future
    if (startDate > now && !promotion.isActive) {
      this.tasks.push({
        promotionId: promotion.id,
        action: 'activate',
        scheduledTime: startDate,
        executed: false
      });
      console.log(`📅 Scheduled activation for promotion ${promotion.id} at ${startDate.toISOString()}`);
    }

    // Schedule deactivation if in the future
    if (endDate > now) {
      this.tasks.push({
        promotionId: promotion.id,
        action: 'deactivate',
        scheduledTime: endDate,
        executed: false
      });
      console.log(`📅 Scheduled deactivation for promotion ${promotion.id} at ${endDate.toISOString()}`);
    }
  }

  /**
   * Remove a promotion from the scheduler
   */
  removePromotionFromSchedule(promotionId: number): void {
    const initialCount = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.promotionId !== promotionId);
    const removedCount = initialCount - this.tasks.length;
    
    if (removedCount > 0) {
      console.log(`🗑️  Removed ${removedCount} scheduled tasks for promotion ${promotionId}`);
    }
  }

  /**
   * Get current time in South Africa timezone
   */
  private getCurrentSouthAfricaTime(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: this.SOUTH_AFRICA_TIMEZONE }));
  }

  /**
   * Parse a date string in South Africa timezone
   */
  private parseDateInSouthAfricaTime(dateString: string): Date {
    // Assume the date string is already in South Africa timezone
    return new Date(dateString);
  }

  /**
   * Get scheduler status
   */
  getStatus(): { 
    isRunning: boolean; 
    taskCount: number; 
    pendingTasks: number;
    nextTask?: { promotionId: number; action: string; scheduledTime: Date };
  } {
    const now = this.getCurrentSouthAfricaTime();
    const pendingTasks = this.tasks.filter(task => !task.executed && task.scheduledTime > now);
    const nextTask = pendingTasks.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())[0];

    return {
      isRunning: this.isRunning,
      taskCount: this.tasks.length,
      pendingTasks: pendingTasks.length,
      nextTask: nextTask ? {
        promotionId: nextTask.promotionId,
        action: nextTask.action,
        scheduledTime: nextTask.scheduledTime
      } : undefined
    };
  }

  /**
   * Force refresh scheduled tasks from database
   */
  async refreshTasks(): Promise<void> {
    console.log('🔄 Refreshing scheduled tasks...');
    await this.loadScheduledTasks();
  }
}

// Export singleton instance
export const promotionScheduler = new PromotionScheduler();

// Auto-start the scheduler when the module is imported
if (process.env.NODE_ENV !== 'test') {
  promotionScheduler.start();
}