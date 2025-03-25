import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

type SignupData = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  isSeller: boolean;
  isCollector: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing user session on load
  useEffect(() => {
    const checkUser = async () => {
      try {
        // First, check Supabase session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          throw sessionError;
        }
        
        if (session) {
          // We have a Supabase session - get user details from our API
          const res = await apiRequest("GET", "/api/auth/me", undefined);
          const data = await res.json();
          
          if (data.user) {
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
          } else {
            // Fallback to localStorage if API fails
            const savedUser = localStorage.getItem("user");
            if (savedUser) {
              setUser(JSON.parse(savedUser));
            }
          }
        } else {
          // No Supabase session, try localStorage as fallback
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error("Error checking user:", error);
        
        // Last resort - try localStorage
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Set up auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // User signed in via Supabase - fetch user details from API
          try {
            const res = await apiRequest("GET", "/api/auth/me", undefined);
            const data = await res.json();
            
            if (data.user) {
              setUser(data.user);
              localStorage.setItem("user", JSON.stringify(data.user));
            }
          } catch (error) {
            console.error("Error fetching user after sign in:", error);
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out of Supabase - clear local state
          setUser(null);
          localStorage.removeItem("user");
        }
      }
    );

    checkUser();
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Implement Supabase authentication if setup
      // For now, use our API endpoint
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await res.json();
      
      if (!data.user) {
        throw new Error(data.message || "Login failed");
      }
      
      // Save the user to state and localStorage
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (userData: SignupData) => {
    setIsLoading(true);
    try {
      // Register with Supabase if setup
      // For now, use our API endpoint
      const res = await apiRequest("POST", "/api/auth/register", userData);
      const data = await res.json();
      
      if (!data.user) {
        throw new Error(data.message || "Signup failed");
      }
      
      // Save the user to state and localStorage
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      // Sign out from Supabase if setup
      
      // Clear the user from state and localStorage
      setUser(null);
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
