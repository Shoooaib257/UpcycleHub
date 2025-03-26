import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Package, 
  Eye, 
  MessageCircle, 
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

const SellerDashboard = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const supabase = getSupabase();

  // Redirect if not a seller
  if (user && !user.isSeller) {
    navigate("/");
    return null;
  }

  // Fetch seller products
  const { data, isLoading } = useQuery({
    queryKey: ['seller-products', user?.id],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { products: products || [] };
    },
    enabled: Boolean(user?.id),
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (productId: number) => {
      // First delete associated images
      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      if (imagesError) throw imagesError;

      // Then delete the product
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('seller_id', user?.id); // Ensure user owns the product

      if (productError) throw productError;
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "Your listing has been removed successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setProductToDelete(null);
    }
  });

  const handleDeleteProduct = (productId: number) => {
    setProductToDelete(productId);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct.mutate(productToDelete);
    }
  };

  const products = data?.products || [];
  
  // Stats for dashboard cards
  const activeListings = products.filter(p => p.status === 'active').length;
  const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
  
  // For the active conversations stat, we would need to fetch conversations
  // Since we don't have that endpoint yet, we'll use a placeholder
  const activeConversations = 5;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Seller Dashboard</h2>
        <Link href="/add-product">
          <Button className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add New Listing
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary rounded-md p-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-500 truncate">Active Listings</dt>
                  <dd>
                    <div className="text-lg font-medium text-neutral-900">
                      {isLoading ? (
                        <div className="h-6 bg-neutral-200 rounded w-8 animate-pulse"></div>
                      ) : (
                        activeListings
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-600 rounded-md p-3">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-500 truncate">Total Views</dt>
                  <dd>
                    <div className="text-lg font-medium text-neutral-900">
                      {isLoading ? (
                        <div className="h-6 bg-neutral-200 rounded w-12 animate-pulse"></div>
                      ) : (
                        totalViews
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-500 rounded-md p-3">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-500 truncate">Active Conversations</dt>
                  <dd>
                    <div className="text-lg font-medium text-neutral-900">
                      {isLoading ? (
                        <div className="h-6 bg-neutral-200 rounded w-8 animate-pulse"></div>
                      ) : (
                        activeConversations
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product listings table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
          <h3 className="text-lg leading-6 font-medium text-neutral-900">Your Listed Items</h3>
        </div>
        
        {isLoading ? (
          <div className="animate-pulse p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center py-4 border-b border-neutral-200">
                <div className="flex-shrink-0 h-16 w-16 bg-neutral-200 rounded-md"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-neutral-200 rounded w-16"></div>
                <div className="ml-4 h-6 bg-neutral-200 rounded w-20"></div>
                <div className="ml-4 h-4 bg-neutral-200 rounded w-12"></div>
                <div className="ml-4 h-4 bg-neutral-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-600">You don't have any listings yet.</p>
            <Link href="/add-product">
              <Button className="mt-4">
                Add Your First Listing
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Listed Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-neutral-200 rounded-md overflow-hidden">
                        {/* We would fetch product images here */}
                        <div className="h-full w-full bg-neutral-300"></div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">{product.title}</div>
                        <div className="text-sm text-neutral-500">{product.category}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-neutral-900">${(product.price / 100).toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : product.status === 'sold'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">{product.views || 0}</TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {product.created_at 
                      ? format(new Date(product.created_at), 'MMM d, yyyy')
                      : 'Recently'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/product/${product.id}`}>View</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/edit-product/${product.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={productToDelete !== null} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your listing. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SellerDashboard;
