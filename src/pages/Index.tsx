import { useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Instant redirect based on cached session - don't wait for auth
  useLayoutEffect(() => {
    const cachedSession = localStorage.getItem('sb-cbfqwaqwliehgxsdueem-auth-token');
    if (cachedSession) {
      // User likely logged in - go to home immediately
      navigate("/home", { replace: true });
    } else {
      // No session - go to landing immediately
      navigate("/landing", { replace: true });
    }
  }, [navigate]);

  // Fallback: handle auth state changes after initial redirect
  useEffect(() => {
    if (isLoading) return;
    
    const currentPath = window.location.pathname;
    if (currentPath === "/") {
      if (user) {
        navigate("/home", { replace: true });
      } else {
        navigate("/landing", { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  return null;
};

export default Index;
