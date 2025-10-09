import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/home");
    } else {
      navigate("/landing");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="glass glow-primary rounded-2xl p-8">
        <h1 className="text-4xl font-bold text-gradient-primary">
          SpecVerse
        </h1>
        <p className="text-muted-foreground mt-2">Loading...</p>
      </div>
    </div>
  );
};

export default Index;
