import AdminLayout from "@/components/admin/layout";
import { CorporateOrdersPage } from "@/components/admin/CorporateOrdersPage";

export default function CorporateOrdersPageWrapper() {
  return (
    <AdminLayout>
      <CorporateOrdersPage />
    </AdminLayout>
  );
}