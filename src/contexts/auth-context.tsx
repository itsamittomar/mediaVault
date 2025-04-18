import { createContext, useContext, useState, useEffect } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // For demo purposes, mock successful login with email "user@example.com" and password "password"
        if (email === 'user@example.com' && password === 'password') {
          const user = {
            id: '1',
            name: 'John Doe',
            email: 'user@example.com',
            role: 'user' as const,
          };
          localStorage.setItem('user', JSON.stringify(user));
          setUser(user);
          resolve();
        } else if (email === 'admin@example.com' && password === 'password') {
          const admin = {
            id: '2',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin' as const,
          };
          localStorage.setItem('user', JSON.stringify(admin));
          setUser(admin);
          resolve();
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1000);
    });
  };

  const register = async (name: string, email: string, password: string) => {
    // Simulate API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Check if email is already taken
        if (email === 'user@example.com') {
          reject(new Error('Email already exists'));
          return;
        }
        
        const newUser = {
          id: Math.random().toString(36).substring(2, 9),
          name,
          email,
          role: 'user' as const,
        };
        
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
        resolve();
      }, 1000);
    });
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}