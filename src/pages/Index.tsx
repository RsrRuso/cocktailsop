import { useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Immediate sync check on mount for fastest navigation
  useLayoutEffect(() => {
    const checkAndNavigate = async () => {
      // Check session synchronously from localStorage cache first
      const cachedSession = localStorage.getItem('sb-cbfqwaqwliehgxsdueem-auth-token');
      if (cachedSession) {
        try {
          const parsed = JSON.parse(cachedSession);
          if (parsed?.access_token) {
            navigate("/home", { replace: true });
            return;
          }
        } catch {}
      }
      
      // If no cached session, check Supabase directly
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/home", { replace: true });
      } else {
        navigate("/landing", { replace: true });
      }
    };
    
    checkAndNavigate();
  }, [navigate]);

  // Fallback with auth context
  useEffect(() => {
    if (isLoading) return;
    
    if (user) {
      navigate("/home", { replace: true });
    } else {
      navigate("/landing", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return null;
};

export default Index;
