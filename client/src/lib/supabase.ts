import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = 'https://ridfkjjfevslrpjegisf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpZGZrampmZXZzbHJwamVnaXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3OTA1NzIsImV4cCI6MjA1ODM2NjU3Mn0.tmhyOkwtuuLFPS932DE82jYAmcBAQ6QALZP5Daqh3x8';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Bucket name constant for easier management
const BUCKET_NAME = 'upcycle-hub';

// Function to ensure the bucket exists before uploading
async function ensureBucketExists(): Promise<boolean> {
  try {
    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error checking buckets:', listError);
      return false;
    }
    
    // Check if our bucket already exists
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }
      
      console.log(`Bucket '${BUCKET_NAME}' created successfully.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in ensureBucketExists:', error);
    return false;
  }
}

// Function to upload product image to Supabase storage
export async function uploadProductImage(file: File, productId: string): Promise<string | null> {
  try {
    // Ensure bucket exists before attempting upload
    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      console.error('Bucket not ready for upload.');
      return null;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
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
    // Ensure bucket exists first
    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      console.error('Bucket not ready for deletion operation.');
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
