import { useState, useRef } from "react";
import { Upload, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadProductImage } from "@/lib/supabase";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface ImageUploadProps {
  productId: string;
  onImageUploaded: (url: string, isMain: boolean) => void;
  maxImages?: number;
  isMainUpload?: boolean;
}

const ImageUpload = ({ 
  productId, 
  onImageUploaded, 
  maxImages = 6, 
  isMainUpload = false 
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the image
    setIsUploading(true);
    try {
      const imageUrl = await uploadProductImage(file, productId);
      if (imageUrl) {
        onImageUploaded(imageUrl, isMainUpload);
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <AspectRatio ratio={1} className="bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-md overflow-hidden">
        {preview ? (
          <div className="w-full h-full relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {isUploading ? (
              <div className="animate-pulse text-neutral-400">Uploading...</div>
            ) : (
              <>
                {isMainUpload ? (
                  <Upload className="h-10 w-10 text-neutral-400 mb-2" />
                ) : (
                  <Plus className="h-10 w-10 text-neutral-400 mb-2" />
                )}
                <span className="text-xs text-neutral-500">
                  {isMainUpload ? "Main Photo" : "Add Photo"}
                </span>
              </>
            )}
          </div>
        )}
      </AspectRatio>
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        disabled={isUploading}
      />
      {isMainUpload && (
        <div className="mt-1 text-center text-xs text-neutral-500">Main Photo</div>
      )}
    </div>
  );
};

export default ImageUpload;
