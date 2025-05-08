import { AttributeRedesignPlaceholder } from "@/components/admin/attribute-redesign-placeholder";
import { AdminLayout } from "@/components/admin/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

/**
 * Product Attributes Management Page
 * Temporarily disabled during attribute system redesign
 */
export default function ProductAttributes() {
  const [, setLocation] = useLocation();
  const { productId } = useParams<{ productId: string }>();
  
  // Fetch minimal product data for the header
  const { data: product } = useQuery({
    queryKey: ['/api/products', productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Failed to fetch product");
      return res.json();
    },
    enabled: !!productId
  });

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="mr-2"
              onClick={() => setLocation(`/admin/products/${productId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Product
            </Button>
            <h1 className="text-2xl font-bold">
              Attributes for {product?.name || 'Product'}
            </h1>
          </div>
          <Badge variant="outline" className="text-sm">
            Product ID: {productId}
          </Badge>
        </div>

        <AttributeRedesignPlaceholder
          title="Product Attributes Management"
          description="We are rebuilding the attribute system to improve performance and user experience. The product attributes management page is temporarily unavailable during this upgrade process."
        />
      </div>
    </AdminLayout>
  );
}