import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    
    if (user) {
      navigate("/home", { replace: true });
    } else {
      navigate("/landing", { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Minimal loading state
  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  return null;
};

export default Index;
