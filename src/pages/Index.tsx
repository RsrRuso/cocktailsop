import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePageTransition } from "@/hooks/usePageTransition";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  usePageTransition();

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session) {
          navigate("/home", { replace: true });
        } else {
          navigate("/landing", { replace: true });
        }
      } catch (error) {
        console.log('Auth check error, redirecting to landing');
        if (isMounted) {
          navigate("/landing", { replace: true });
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    // Start auth check immediately
    checkAuth();
    
    // Fallback timeout - if still checking after 2 seconds, redirect to landing
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && isChecking) {
        console.log('Auth check fallback timeout, redirecting to landing');
        navigate("/landing", { replace: true });
        setIsChecking(false);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
    };
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return null;
};

export default Index;
