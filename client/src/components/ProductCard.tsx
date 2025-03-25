import { Link } from "wouter";
import { Product, ProductImage } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProductCardProps = {
  product: Product;
  mainImage?: ProductImage | null;
  showViewButton?: boolean;
};

const ProductCard = ({ product, mainImage, showViewButton = true }: ProductCardProps) => {
  // Format price from cents to dollars with 2 decimal places
  const formattedPrice = `$${(product.price / 100).toFixed(2)}`;

  // Default image if none is provided
  const imageUrl = mainImage?.url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80";

  return (
    <div className="group relative">
      <div className="w-full min-h-80 bg-neutral-200 aspect-w-1 aspect-h-1 rounded-md overflow-hidden group-hover:opacity-75 lg:h-80 lg:aspect-none">
        <img 
          src={imageUrl} 
          alt={product.title} 
          className="w-full h-full object-center object-cover lg:w-full lg:h-full"
          loading="lazy"
        />
      </div>
      <div className="mt-4 flex justify-between">
        <div>
          <h3 className="text-sm text-neutral-700">{product.title}</h3>
          <p className="mt-1 text-sm text-neutral-500">{product.category}</p>
        </div>
        <p className="text-sm font-medium text-neutral-900">{formattedPrice}</p>
      </div>
      
      {showViewButton && (
        <Link href={`/product/${product.id}`}>
          <Button 
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
          >
            View Details
          </Button>
        </Link>
      )}
    </div>
  );
};

export default ProductCard;
