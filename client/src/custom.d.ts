// React JSX declarations
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Module declarations for libraries that don't have TypeScript types
declare module 'react';
declare module '@tanstack/react-query';
declare module 'wouter';
declare module 'date-fns';
declare module 'lucide-react';
declare module 'react-hook-form';
declare module '@hookform/resolvers/zod';
declare module 'zod';

// Declare modules for local component imports 
declare module '@/components/*';
declare module '@/context/*';
declare module '@/hooks/*';
declare module '@/lib/*';
declare module '@shared/*'; 