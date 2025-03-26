// Import only what we need from Supabase
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client lazily to reduce initial load
let supabaseInstance: SupabaseClient | null = null;

// Export a function to get the Supabase client
export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials not found in environment variables.');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseInstance;
};

// For backward compatibility
export const supabase = getSupabase();

// Bucket name constant for easier management
const BUCKET_NAME = import.meta.env.VITE_STORAGE_BUCKET_NAME || 'upcycle-hub';

// Function to check if bucket exists and is accessible
async function isBucketAccessible(): Promise<boolean> {
  try {
    // First try to list bucket content to see if it exists and is accessible
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list();
      
    if (error) {
      console.log('Bucket access check error (might just mean the bucket is empty):', error);
      // This could mean the bucket doesn't exist OR it's just empty,
      // let's continue and try to upload anyway
      return true;  // Continue with upload attempt
    }
    
    return true;  // Bucket exists and is accessible
  } catch (error) {
    console.error('Error checking bucket accessibility:', error);
    return false;
  }
}

// Function to upload product image to Supabase storage
export async function uploadProductImage(file: File, productId: string): Promise<string | null> {
  try {
    // Check if the bucket is accessible
    const isAccessible = await isBucketAccessible();
    if (!isAccessible) {
      console.error('Bucket is not accessible.');
      return null;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    // Attempt the upload directly
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      
      // If it's a bucket not found error, let the user know
      if (error.message.includes('not found')) {
        console.error('The bucket does not exist. Please create it in the Supabase dashboard.');
      }
      
      // If it's a permissions error, let the user know
      if (error.message.includes('security policy')) {
        console.error('Permission denied. Please check Row Level Security policies in Supabase.');
      }
      
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
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
    // Check if the bucket is accessible
    const isAccessible = await isBucketAccessible();
    if (!isAccessible) {
      console.error('Bucket is not accessible for deletion.');
      return false;
    }
    
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const productId = pathParts[pathParts.length - 2];
    const filePath = `product-images/${productId}/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
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
