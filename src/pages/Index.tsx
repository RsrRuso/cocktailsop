import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to fully initialize before making any decisions
    if (isLoading) return;
    
    if (user) {
      navigate("/home", { replace: true });
    } else {
      // Only redirect to landing if we're certain there's no session
      // Check localStorage as a fallback to prevent premature redirect
      const cachedSession = localStorage.getItem('sb-cbfqwaqwliehgxsdueem-auth-token');
      if (!cachedSession) {
        navigate("/landing", { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  return null;
};

export default Index;
