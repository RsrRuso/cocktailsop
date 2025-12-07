import { useEffect, useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  // Use layoutEffect for synchronous redirect before paint
  useLayoutEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        // Try to get cached session first for instant redirect
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session) {
          navigate("/home", { replace: true });
        } else {
          navigate("/landing", { replace: true });
        }
      } catch (error) {
        if (isMounted) {
          navigate("/landing", { replace: true });
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    // Start immediately
    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Minimal loading state - just blank for fastest perceived load
  if (isChecking) {
    return <div className="min-h-screen bg-background" />;
  }

  return null;
};

export default Index;
