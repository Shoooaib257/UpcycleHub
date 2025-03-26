import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const supabase = getSupabase();
  
  // Fetch product details
  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      // Fetch product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) throw productError;
      if (!product) throw new Error('Product not found');

      // Fetch product images
      const { data: images, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id);

      if (imagesError) throw imagesError;

      return { 
        product,
        images: images || []
      };
    },
  });

  // Fetch seller details
  const { data: sellerData, isLoading: isLoadingSeller } = useQuery({
    queryKey: ['user', data?.product?.seller_id],
    queryFn: async () => {
      const { data: user, error } = await supabase
        .from('users')
        .select('full_name, created_at')
        .eq('id', data?.product?.seller_id)
        .single();

      if (error) throw error;
      return { user };
    },
    enabled: Boolean(data?.product?.seller_id),
  });

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to contact the seller");
      }
      
      if (user.id === data?.product?.seller_id) {
        throw new Error("You cannot contact yourself");
      }
      
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          product_id: Number(id),
          buyer_id: user.id,
          seller_id: data?.product?.seller_id
        })
        .select()
        .single();

      if (error) throw error;
      return { conversation };
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Chat started with seller.",
      });
      navigate(`/messages/${data.conversation.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation.",
        variant: "destructive",
      });
      
      if (!user) {
        // Redirect to login if not logged in
        navigate("/auth");
      }
    },
  });

  const handleContactSeller = () => {
    createConversation.mutate();
  };
  
  const product = data?.product;
  const images = data?.images || [];
  const seller = sellerData?.user;
  
  // Use the first image as main or a placeholder if no images
  const mainImage = images.length > 0 
    ? images[selectedImageIndex]?.url
    : "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=900&q=80";
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="md:flex md:items-start">
            <div className="md:w-1/2">
              <div className="aspect-w-1 aspect-h-1 w-full bg-neutral-200 rounded-lg"></div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-w-1 aspect-h-1 rounded-md overflow-hidden bg-neutral-200"></div>
                ))}
              </div>
            </div>
            <div className="md:w-1/2 md:ml-8 mt-6 md:mt-0">
              <div className="h-8 bg-neutral-200 rounded w-3/4 mb-4"></div>
              <div className="h-6 bg-neutral-200 rounded w-1/4 mb-6"></div>
              <div className="h-10 bg-neutral-200 rounded-full w-10 mb-2"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/3 mb-1"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/4 mb-6"></div>
              <div className="h-5 bg-neutral-200 rounded w-1/4 mb-2"></div>
              <div className="h-24 bg-neutral-200 rounded w-full mb-6"></div>
              <div className="h-5 bg-neutral-200 rounded w-1/4 mb-2"></div>
              <div className="border-t border-b border-neutral-200 py-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
                    <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex space-x-4">
                <div className="h-12 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-12 bg-neutral-200 rounded w-12"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-neutral-900">Product not found</h2>
        <p className="mt-2 text-neutral-600">The product you're looking for does not exist or has been removed.</p>
        <Button className="mt-4" onClick={() => navigate("/browse")}>
          Browse other products
        </Button>
      </div>
    );
  }

  // Format price from cents to dollars
  const formattedPrice = `$${(product.price / 100).toFixed(2)}`;
  
  // Calculate "Seller since" date
  const sellerSinceYear = seller?.created_at 
    ? new Date(seller.created_at).getFullYear() 
    : new Date().getFullYear();

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-start">
        {/* Product Images */}
        <div className="md:w-1/2">
          <div className="aspect-w-1 aspect-h-1 w-full">
            <img 
              src={mainImage} 
              alt={product.title} 
              className="h-full w-full object-cover object-center rounded-lg"
            />
          </div>
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {images.map((image, index) => (
                <div 
                  key={image.id} 
                  className={`aspect-w-1 aspect-h-1 rounded-md overflow-hidden cursor-pointer ${
                    index === selectedImageIndex ? 'border-2 border-primary' : ''
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img 
                    src={image.url} 
                    alt="" 
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="md:w-1/2 md:ml-8 mt-6 md:mt-0">
          <h2 className="text-2xl font-bold text-neutral-900">{product.title}</h2>
          <div className="mt-2">
            <p className="text-3xl text-neutral-900">{formattedPrice}</p>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-neutral-200 text-neutral-600">
                  {seller?.full_name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-900">{seller?.full_name || 'Anonymous'}</p>
                <p className="text-sm text-neutral-500">Seller since {sellerSinceYear}</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-medium text-neutral-900">Description</h3>
            <p className="mt-2 text-neutral-700">{product.description}</p>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-medium text-neutral-900">Details</h3>
            <div className="mt-2 border-t border-b border-neutral-200 py-2">
              <div className="flex justify-between py-1">
                <dt className="text-sm text-neutral-500">Condition</dt>
                <dd className="text-sm text-neutral-900">{product.condition}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-sm text-neutral-500">Category</dt>
                <dd className="text-sm text-neutral-900">{product.category}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-sm text-neutral-500">Location</dt>
                <dd className="text-sm text-neutral-900">{product.location}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-sm text-neutral-500">Listed</dt>
                <dd className="text-sm text-neutral-900">
                  {product.created_at ? format(new Date(product.created_at), 'PPP') : 'Recently'}
                </dd>
              </div>
            </div>
          </div>
          <div className="mt-8 flex space-x-4">
            <Button 
              className="flex-1 bg-primary hover:bg-emerald-700 text-white py-3 px-6 rounded-md font-medium"
              onClick={handleContactSeller}
              disabled={createConversation.isPending || user?.id === product.seller_id}
            >
              {createConversation.isPending 
                ? "Connecting..." 
                : user?.id === product.seller_id
                  ? "Your Listing"
                  : "Contact Seller"
              }
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="flex items-center justify-center px-3 py-3 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
            >
              <Heart className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
