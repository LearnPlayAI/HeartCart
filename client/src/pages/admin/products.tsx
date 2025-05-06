import React from 'react';
import AdminLayout from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Package, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Eye,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

// Example product data
const products = [
  {
    id: 1,
    name: "Wireless Earbuds",
    category: "Electronics",
    price: 59.99,
    stock: 45,
    status: "Active"
  },
  {
    id: 2,
    name: "Smart Watch",
    category: "Electronics",
    price: 129.99,
    stock: 28,
    status: "Active"
  },
  {
    id: 3,
    name: "Phone Case - Black",
    category: "Accessories",
    price: 19.99,
    stock: 102,
    status: "Active"
  },
  {
    id: 4,
    name: "Bluetooth Speaker",
    category: "Electronics",
    price: 89.99,
    stock: 17,
    status: "Active"
  },
  {
    id: 5,
    name: "Laptop Sleeve",
    category: "Accessories",
    price: 29.99,
    stock: 53,
    status: "Active"
  },
  {
    id: 6,
    name: "Power Bank 20000mAh",
    category: "Electronics",
    price: 49.99,
    stock: 31,
    status: "Active"
  },
  {
    id: 7,
    name: "Fitness Tracker",
    category: "Electronics",
    price: 79.99,
    stock: 0,
    status: "Out of Stock"
  },
  {
    id: 8,
    name: "Wireless Mouse",
    category: "Electronics",
    price: 24.99,
    stock: 42,
    status: "Active"
  }
];

function ProductsPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Products</h1>
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="search" 
              placeholder="Search products..." 
              className="pl-8"
            />
          </div>
          <Button variant="outline">
            <Tag className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <Button variant="outline">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Sort
          </Button>
        </div>
        
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>
                  Manage your product inventory, prices, and categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 text-left">Name</th>
                        <th className="py-3 text-left">Category</th>
                        <th className="py-3 text-right">Price</th>
                        <th className="py-3 text-right">Stock</th>
                        <th className="py-3 text-left">Status</th>
                        <th className="py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr 
                          key={product.id} 
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 text-left font-medium">{product.name}</td>
                          <td className="py-3 text-left">{product.category}</td>
                          <td className="py-3 text-right">{formatCurrency(product.price)}</td>
                          <td className="py-3 text-right">{product.stock}</td>
                          <td className="py-3 text-left">
                            <Badge variant={product.status === "Active" ? "default" : "destructive"}>
                              {product.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>View</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Other tabs will have similar content - we're just implementing the UI structure now */}
          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Products</CardTitle>
                <CardDescription>
                  Products that are currently available for purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-gray-500">
                  <Package className="h-12 w-12 mx-auto opacity-50" />
                  <p className="mt-2">Active products will be listed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="out-of-stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Out of Stock Products</CardTitle>
                <CardDescription>
                  Products that need to be restocked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-gray-500">
                  <Package className="h-12 w-12 mx-auto opacity-50" />
                  <p className="mt-2">Out of stock products will be listed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="archived" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Archived Products</CardTitle>
                <CardDescription>
                  Products that are no longer available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-gray-500">
                  <Package className="h-12 w-12 mx-auto opacity-50" />
                  <p className="mt-2">Archived products will be listed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default ProductsPage;