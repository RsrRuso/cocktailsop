import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface BackToProfileDoorProps {
  className?: string;
}

export const BackToProfileDoor = ({ className }: BackToProfileDoorProps) => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate('/profile')}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-b from-primary/20 to-primary/10 border border-primary/30 backdrop-blur-sm hover:from-primary/30 hover:to-primary/20 transition-all ${className}`}
    >
      {/* Mini door icon */}
      <div className="relative w-6 h-8 rounded-t-md bg-gradient-to-b from-white/15 to-white/5 border border-white/20 flex items-center justify-center">
        <div className="absolute right-0.5 top-1/2 w-1 h-1 rounded-full bg-amber-400" />
        <ArrowLeft className="w-3 h-3 text-foreground" />
      </div>
      <span className="text-xs font-semibold text-foreground">Profile</span>
    </motion.button>
  );
};
