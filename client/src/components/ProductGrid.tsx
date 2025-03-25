import { Product, ProductImage } from "@shared/schema";
import ProductCard from "@/components/ProductCard";

type ProductGridProps = {
  products: Product[];
  productImages?: Record<number, ProductImage[]>;
  showViewButton?: boolean;
};

const ProductGrid = ({ 
  products,
  productImages = {},
  showViewButton = true 
}: ProductGridProps) => {
  // Function to get the main image for a product
  const getMainImage = (productId: number): ProductImage | null => {
    const images = productImages[productId] || [];
    
    // First try to find an image marked as main
    const mainImage = images.find(img => img.isMain);
    if (mainImage) return mainImage;
    
    // If no main image is marked, just use the first one
    return images[0] || null;
  };

  return (
    <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          mainImage={getMainImage(product.id)}
          showViewButton={showViewButton}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
