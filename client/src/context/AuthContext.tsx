import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
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
        const supabase = getSupabase();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          throw sessionError;
        }
        
        if (session?.user) {
          const userData: User = {
            id: parseInt(session.user.id),
            uuid: session.user.id,
            email: session.user.email!,
            username: session.user.user_metadata.username || '',
            fullName: session.user.user_metadata.full_name || '',
            avatar: session.user.user_metadata.avatar,
            isSeller: session.user.user_metadata.is_seller || false,
            isCollector: session.user.user_metadata.is_collector || false,
            createdAt: new Date(session.user.created_at)
          };
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } else {
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error("Error checking user:", error);
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    const supabase = getSupabase();
    
    // Set up auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const userData: User = {
            id: parseInt(session.user.id),
            uuid: session.user.id,
            email: session.user.email!,
            username: session.user.user_metadata.username || '',
            fullName: session.user.user_metadata.full_name || '',
            avatar: session.user.user_metadata.avatar,
            isSeller: session.user.user_metadata.is_seller || false,
            isCollector: session.user.user_metadata.is_collector || false,
            createdAt: new Date(session.user.created_at)
          };
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem("user");
        }
      }
    );

    checkUser();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Login failed - no user data returned");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupData) => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            username: userData.username,
            is_seller: userData.isSeller,
            is_collector: userData.isCollector
          }
        }
      });
      
      if (error) {
        console.error("Signup error:", error);
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error("Signup failed - no user data returned");
      }

      // Create user object from Supabase data
      const newUser: User = {
        id: parseInt(data.user.id),
        uuid: data.user.id,
        email: data.user.email!,
        username: userData.username,
        fullName: userData.fullName,
        avatar: null,
        isSeller: userData.isSeller,
        isCollector: userData.isCollector,
        createdAt: new Date(data.user.created_at)
      };

      // Update local state
      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));

      return newUser;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
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
