import { CorporateOrdersPage } from "@/components/admin/CorporateOrdersPage";
import AdminLayout from "@/components/admin/layout";

export default function CorporateOrdersPageWrapper() {
  return (
    <AdminLayout>
      <CorporateOrdersPage />
    </AdminLayout>
  );
}