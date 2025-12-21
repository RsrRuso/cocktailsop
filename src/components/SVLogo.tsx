import { useNavigate } from "react-router-dom";
import svLogo from "@/assets/sv-logo.png";
import { cn } from "@/lib/utils";

interface SVLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24"
};

export const SVLogo = ({ 
  size = "md", 
  showText = false, 
  className,
  onClick,
  clickable = true
}: SVLogoProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (clickable) {
      navigate("/home");
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        clickable && "cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
      onClick={handleClick}
    >
      <img 
        src={svLogo} 
        alt="SpecVerse" 
        className={cn(
          sizeClasses[size],
          "rounded-lg object-contain shadow-md"
        )}
        style={{
          filter: 'sepia(15%) saturate(1.2) hue-rotate(-5deg)',
          boxShadow: '0 0 15px rgba(234, 179, 8, 0.25), 0 4px 16px rgba(0, 0, 0, 0.3)'
        }}
      />
      {showText && (
        <span className="text-2xl sm:text-3xl font-instagram text-foreground tracking-tight">
          SpecVerse
        </span>
      )}
    </div>
  );
};

export default SVLogo;
