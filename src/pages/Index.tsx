import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePageTransition } from "@/hooks/usePageTransition";

const Index = () => {
  const navigate = useNavigate();
  usePageTransition(); // Track performance

  useEffect(() => {
    const startTime = performance.now();
    
    // Try to get cached session synchronously first
    const cachedSession = localStorage.getItem('sb-cbfqwaqwliehgxsdueem-auth-token');
    
    if (cachedSession) {
      // Navigate immediately based on cached session
      const loadTime = performance.now() - startTime;
      console.log(`Fast auth check: ${loadTime.toFixed(2)}ms`);
      navigate("/home", { replace: true });
    } else {
      // Only check async if no cache
      checkAuth(startTime);
    }
  }, []);

  const checkAuth = async (startTime: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    const loadTime = performance.now() - startTime;
    console.log(`Full auth check: ${loadTime.toFixed(2)}ms`);
    
    if (session) {
      navigate("/home", { replace: true });
    } else {
      navigate("/landing", { replace: true });
    }
  };

  return null; // No UI needed, immediate redirect
};

export default Index;
