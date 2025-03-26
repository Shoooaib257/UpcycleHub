// @ts-ignore
import { useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
// @ts-ignore
import { Button } from "@/components/ui/button";
// @ts-ignore
import { Input } from "@/components/ui/input";
// @ts-ignore
import { Loader2, Upload } from "lucide-react";

interface ImageUploadProps {
  productId: number;
  onImageUploaded: (url: string, isMain: boolean) => void;
  isMainUpload?: boolean;
}

const ImageUpload = ({ 
  productId, 
  onImageUploaded, 
  isMainUpload = false 
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  // @ts-ignore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabase();

  // @ts-ignore
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Create a preview for the UI
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}-${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Store the image reference in the database
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          url: publicUrl,
          is_main: isMainUpload
        });

      if (dbError) throw dbError;

      // Notify parent component
      onImageUploaded(publicUrl, isMainUpload);
    } catch (error) {
      console.error("Error uploading image:", error);
      // If we have a preview, use it as a fallback
      if (preview) {
        console.log("Using preview as fallback");
        onImageUploaded(preview, isMainUpload);
      }
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

  // @ts-ignore
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {preview && (
          <Button
            variant="outline"
            onClick={clearImage}
            disabled={isUploading}
          >
            Clear
          </Button>
        )}
      </div>

      {isUploading && (
        <div className="flex items-center gap-2 text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading...</span>
        </div>
      )}

      {preview && (
        <div className="relative aspect-square w-40 overflow-hidden rounded-lg border">
          <img
            src={preview}
            alt="Preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
