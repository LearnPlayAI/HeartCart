import { AttributeRedesignPlaceholder } from "@/components/admin/attribute-redesign-placeholder";
import { AdminLayout } from "@/components/admin/layout";

/**
 * Category Attributes Management Page
 * Temporarily disabled during attribute system redesign
 */
export default function CategoryAttributes() {
  return (
    <AdminLayout>
      <AttributeRedesignPlaceholder
        title="Category Attributes Management"
        description="We are rebuilding the attribute system to improve performance and user experience. The category attributes management page is temporarily unavailable during this upgrade process."
      />
    </AdminLayout>
  );
}