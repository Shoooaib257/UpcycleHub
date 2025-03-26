import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const AuthCallback: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const supabase = getSupabase();
      
      try {
        // Exchange the code for a session
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error('Error confirming email:', error);
          setLocation('/auth/error?message=Email confirmation failed');
          return;
        }

        if (session?.user) {
          // Log the user in
          await login(session.user.email!, session.user.user_metadata.password || '');
          setLocation('/dashboard'); // or wherever you want to redirect after confirmation
        }
      } catch (error) {
        console.error('Error in email confirmation:', error);
        setLocation('/auth/error?message=Email confirmation failed');
      }
    };

    handleEmailConfirmation();
  }, [setLocation, login]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Confirming your email...</h1>
        <p>Please wait while we verify your email address.</p>
      </div>
    </div>
  );
};

export default AuthCallback; 