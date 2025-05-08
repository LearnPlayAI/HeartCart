import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/layout";
import { ArrowLeft } from "lucide-react";

interface AttributeRedesignPlaceholderProps {
  title: string;
  description: string;
}

/**
 * Placeholder component for attribute pages during redesign
 */
export function AttributeRedesignPlaceholder({ title, description }: AttributeRedesignPlaceholderProps) {
  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>

        <Card className="border-2 border-dashed border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-700">Temporarily Unavailable</CardTitle>
            <CardDescription className="text-yellow-600">
              This page is temporarily unavailable during the attribute system redesign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-md p-6 mb-4">
              <h3 className="text-lg font-medium mb-2">What's happening?</h3>
              <p className="text-gray-600 mb-4">
                {description}
              </p>
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h4 className="text-blue-800 font-medium mb-2">Redesign Details</h4>
                <ul className="list-disc list-inside text-blue-700 space-y-2">
                  <li>Simplified attribute management structure</li>
                  <li>Improved performance and reliability</li>
                  <li>Enhanced user interface for attribute selection</li>
                  <li>Better support for complex product variations</li>
                  <li>Streamlined inventory and pricing management</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-yellow-100 rounded-b-lg">
            <p className="text-sm text-yellow-800">
              This feature will be available again soon. Thank you for your patience during the upgrade.
            </p>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
}