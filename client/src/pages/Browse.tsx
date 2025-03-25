import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ProductGrid from "@/components/ProductGrid";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Filter } from "lucide-react";
import { Product } from "@shared/schema";

const ITEMS_PER_PAGE = 8;

const Browse = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/api/products?category=${selectedCategory}` 
        : '/api/products';
      const res = await apiRequest('GET', url, undefined);
      return res.json();
    },
  });

  // Fetch images for products
  const { data: imagesData, isLoading: isLoadingImages } = useQuery({
    queryKey: ['/api/products/images', productsData?.products],
    queryFn: async () => {
      if (!productsData || !productsData.products || !productsData.products.length) {
        return { images: {} };
      }
      
      const productImagesMap: Record<number, any[]> = {};
      
      await Promise.all(
        productsData.products.map(async (product: Product) => {
          const res = await apiRequest('GET', `/api/products/${product.id}/images`, undefined);
          const data = await res.json();
          productImagesMap[product.id] = data.images || [];
        })
      );
      
      return { images: productImagesMap };
    },
    enabled: Boolean(productsData?.products?.length),
  });

  const products = productsData?.products || [];
  const productImages = imagesData?.images || {};
  const isLoading = isLoadingProducts || isLoadingImages;

  // Filter products by search query
  const filteredProducts = products.filter((product: Product) => {
    if (!searchQuery) return true;
    return (
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The filtering happens in real-time above, this just prevents form submission
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1); // Reset to first page when changing category
  };

  return (
    <section className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4 md:mb-0">Browse Items</h2>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-grow w-full sm:w-auto">
              <Input
                type="search"
                className="w-full pr-10"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
            </form>
            
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Clothing">Clothing</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Furniture">Furniture</SelectItem>
                <SelectItem value="Home Goods">Home Goods</SelectItem>
                <SelectItem value="Photography">Photography</SelectItem>
                <SelectItem value="Vintage">Vintage</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
            {[...Array(ITEMS_PER_PAGE)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="w-full min-h-80 bg-neutral-200 aspect-w-1 aspect-h-1 rounded-md"></div>
                <div className="mt-4 flex justify-between">
                  <div>
                    <div className="h-4 bg-neutral-200 rounded w-24"></div>
                    <div className="mt-1 h-3 bg-neutral-200 rounded w-16"></div>
                  </div>
                  <div className="h-4 bg-neutral-200 rounded w-12"></div>
                </div>
                <div className="mt-2 h-8 bg-neutral-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-neutral-600">No items found. Try adjusting your search criteria.</p>
              </div>
            ) : (
              <ProductGrid
                products={paginatedProducts}
                productImages={productImages}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }} 
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      let pageNum: number;
                      
                      if (totalPages <= 5) {
                        // If there are 5 or fewer pages, just show all pages
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        // If we're near the start, show pages 1-5
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        // If we're near the end, show the last 5 pages
                        pageNum = totalPages - 4 + i;
                      } else {
                        // Otherwise show 2 pages before and after the current page
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }} 
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Browse;
