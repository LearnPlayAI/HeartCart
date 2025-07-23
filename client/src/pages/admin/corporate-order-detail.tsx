import AdminLayout from "@/components/admin/layout";
import { CorporateOrderDetailPage } from "@/components/admin/CorporateOrderDetailPage";

export default function CorporateOrderDetailPageWrapper() {
  return (
    <AdminLayout>
      <CorporateOrderDetailPage />
    </AdminLayout>
  );
}