import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = 'https://ridfkjjfevslrpjegisf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpZGZrampmZXZzbHJwamVnaXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3OTA1NzIsImV4cCI6MjA1ODM2NjU3Mn0.tmhyOkwtuuLFPS932DE82jYAmcBAQ6QALZP5Daqh3x8';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to upload product image to Supabase storage
export async function uploadProductImage(file: File, productId: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from('upcycle-hub')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('upcycle-hub')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    return null;
  }
}

// Function to delete product image from Supabase storage
export async function deleteProductImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const productId = pathParts[pathParts.length - 2];
    const filePath = `product-images/${productId}/${fileName}`;

    const { error } = await supabase.storage
      .from('upcycle-hub')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteProductImage:', error);
    return false;
  }
}
