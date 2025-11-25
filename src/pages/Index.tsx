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
    const checkAuth = async () => {
      try {
        // Quick session check with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 1000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (session) {
          navigate("/home", { replace: true });
        } else {
          navigate("/landing", { replace: true });
        }
      } catch (error) {
        // If timeout or error, assume not logged in
        console.log('Auth check timeout, redirecting to landing');
        navigate("/landing", { replace: true });
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
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
