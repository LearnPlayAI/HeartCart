import { AdminLayout } from '@/components/admin/layout';
import { WebsiteShareCard } from '@/components/admin/WebsiteShareCard';
import { SalesRepMessageCard } from '@/components/admin/SalesRepMessageCard';
import { ProductSharingCard } from '@/components/admin/ProductSharingCard';
import { VATSettingsCard } from '@/components/admin/VATSettingsCard';
import { YocoSettingsCard } from '@/components/admin/YocoSettingsCard';
import { EftSettingsCard } from '@/components/admin/EftSettingsCard';
import { AdminShippingFeeCard } from '@/components/admin/AdminShippingFeeCard';
import { FulvicBannerEditor } from '@/components/admin/FulvicBannerEditor';
import { FulvicCarouselManager } from '@/components/admin/FulvicCarouselManager';

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage text templates and messaging for marketing, sales rep communications, and social sharing
          </p>
        </div>

        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* Payment Configuration Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-blue-700">Payment Configuration</h2>
            <div className="space-y-4">
              <YocoSettingsCard />
              <EftSettingsCard />
              <AdminShippingFeeCard />
            </div>
          </div>

          {/* VAT Configuration Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-orange-700">VAT Configuration</h2>
            <VATSettingsCard />
          </div>

          {/* Fulvic Wellness Marketing Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-purple-700">Fulvic Wellness Marketing</h2>
            <div className="space-y-4">
              <FulvicBannerEditor />
              <FulvicCarouselManager />
            </div>
          </div>

          {/* Website Sharing Section - Moving from Dashboard */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-pink-700">Website Sharing</h2>
            <WebsiteShareCard />
          </div>

          {/* Sales Rep Communications Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-blue-700">Sales Rep Communications</h2>
            <SalesRepMessageCard />
          </div>

          {/* Product Sharing Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-green-700">Product Sharing</h2>
            <ProductSharingCard />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}