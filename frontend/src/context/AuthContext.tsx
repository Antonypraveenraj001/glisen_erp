import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { AuthContextType, User } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  /*
   * IMPORTANT
   *
   * The application must not decide whether the user is logged in
   * until localStorage has been checked.
   *
   * Without this state, ProtectedRoute sees token = null during the
   * first render and immediately redirects to /login.
   */
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const restoreAuthentication = async () => {
      try {
        const savedToken = localStorage.getItem("access_token");
        const savedUser = localStorage.getItem("user");

        /*
         * No saved token means the user is genuinely logged out.
         */
        if (!savedToken) {
          if (isMounted) {
            setToken(null);
            setUser(null);
          }

          return;
        }

        /*
         * We have a token.
         *
         * Restore it first so the application knows that an
         * authentication attempt exists.
         */
        if (isMounted) {
          setToken(savedToken);
        }

        /*
         * Restore cached user information if it exists.
         */
        let cachedUser: User | null = null;

        if (savedUser) {
          try {
            cachedUser = JSON.parse(savedUser) as User;

            if (isMounted) {
              setUser(cachedUser);
            }
          } catch (error) {
            console.error(
              "Failed to parse saved user information:",
              error
            );

            localStorage.removeItem("user");
          }
        }

        /*
         * Verify the saved token against the backend.
         *
         * This prevents the frontend from thinking the user is
         * authenticated when the JWT is invalid or expired.
         */
        try {
          const response = await fetch(
            `${API_BASE_URL}/auth/me`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${savedToken}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(
              `Authentication verification failed: ${response.status}`
            );
          }

          const verifiedUser = (await response.json()) as User;

          if (isMounted) {
            setUser(verifiedUser);
            setToken(savedToken);

            localStorage.setItem(
              "user",
              JSON.stringify(verifiedUser)
            );
          }
        } catch (error) {
          /*
           * Saved token is no longer valid.
           *
           * Clear the old session completely.
           */
          console.warn(
            "Saved authentication token is invalid or expired.",
            error
          );

          localStorage.removeItem("access_token");
          localStorage.removeItem("user");

          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error(
          "Failed to restore authentication:",
          error
        );

        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        /*
         * VERY IMPORTANT
         *
         * ProtectedRoute can now make the authentication decision.
         */
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    restoreAuthentication();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * Login
   */
  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("access_token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  };

  /*
   * Logout
   */
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isAuthLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}