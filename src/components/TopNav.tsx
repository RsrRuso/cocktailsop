import { Bell, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TopNav = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-primary/20">
      <div className="flex items-center justify-between px-4 py-3">
        <h1
          onClick={() => navigate("/home")}
          className="text-2xl font-bold text-gradient-primary cursor-pointer"
        >
          SpecVerse
        </h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/notifications")}
            className="glass-hover p-2 rounded-full relative"
          >
            <Bell className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate("/thunder")}
            className="glass-hover p-2 rounded-full relative"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
