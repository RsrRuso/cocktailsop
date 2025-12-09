import { cn } from "@/lib/utils";

interface BadgeLevelIconProps {
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  isActive?: boolean;
  className?: string;
}

const BadgeLevelIcon = ({ 
  level, 
  size = 'md', 
  showLabel = true,
  isActive = false,
  className 
}: BadgeLevelIconProps) => {
  const sizeClasses = {
    sm: { container: 'w-12 h-12', icon: 'w-6 h-6', label: 'text-[10px]' },
    md: { container: 'w-16 h-16', icon: 'w-8 h-8', label: 'text-xs' },
    lg: { container: 'w-20 h-20', icon: 'w-10 h-10', label: 'text-sm' },
    xl: { container: 'w-24 h-24', icon: 'w-12 h-12', label: 'text-base' }
  };

  const currentSize = sizeClasses[size];

  const renderBronzeIcon = () => (
    <div className={cn(
      currentSize.container,
      "relative rounded-2xl flex items-center justify-center transition-all duration-300",
      isActive 
        ? "bg-[#1e3a5f] shadow-lg shadow-orange-500/20" 
        : "bg-transparent"
    )}>
      <svg viewBox="0 0 48 48" className={currentSize.icon} fill="none">
        {/* Medal ribbon */}
        <path 
          d="M17 4L24 18L31 4" 
          stroke="#cd7f32" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
        />
        {/* Medal circle */}
        <circle 
          cx="24" 
          cy="30" 
          r="12" 
          stroke="#cd7f32" 
          strokeWidth="3.5" 
          fill="none"
        />
        {/* Medal center number */}
        <text 
          x="24" 
          y="35" 
          textAnchor="middle" 
          fill="#cd7f32" 
          fontSize="12" 
          fontWeight="bold"
        >
          1
        </text>
      </svg>
    </div>
  );

  const renderSilverIcon = () => (
    <div className={cn(
      currentSize.container,
      "relative rounded-2xl flex items-center justify-center transition-all duration-300",
      isActive 
        ? "bg-[#1e3a5f] shadow-lg shadow-gray-400/20" 
        : "bg-transparent"
    )}>
      <svg viewBox="0 0 48 48" className={currentSize.icon} fill="none">
        {/* Medal ribbon */}
        <path 
          d="M17 4L24 18L31 4" 
          stroke="#6b7280" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          fill="none"
          opacity="0.7"
        />
        {/* Medal circle */}
        <circle 
          cx="24" 
          cy="30" 
          r="12" 
          stroke="#6b7280" 
          strokeWidth="3" 
          fill="none"
          opacity="0.7"
        />
        {/* Medal center number */}
        <text 
          x="24" 
          y="35" 
          textAnchor="middle" 
          fill="#6b7280" 
          fontSize="12" 
          fontWeight="bold"
          opacity="0.7"
        >
          1
        </text>
      </svg>
    </div>
  );

  const renderGoldIcon = () => (
    <div className={cn(
      currentSize.container,
      "relative rounded-2xl flex items-center justify-center transition-all duration-300",
      isActive 
        ? "bg-[#1e3a5f] shadow-lg shadow-yellow-500/20" 
        : "bg-transparent"
    )}>
      <svg viewBox="0 0 48 48" className={currentSize.icon}>
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        {/* Star shape */}
        <path 
          d="M24 4L28.5 17.5H42L31 26L35.5 40L24 31L12.5 40L17 26L6 17.5H19.5L24 4Z" 
          fill="url(#goldGradient)"
        />
      </svg>
    </div>
  );

  const renderPlatinumIcon = () => (
    <div className={cn(
      currentSize.container,
      "relative rounded-2xl flex items-center justify-center transition-all duration-300",
      isActive 
        ? "bg-[#1e3a5f] shadow-lg shadow-blue-500/20" 
        : "bg-transparent"
    )}>
      {/* Gradient circle background */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 opacity-90" />
      <svg viewBox="0 0 48 48" className={cn(currentSize.icon, "relative z-10")}>
        {/* Star outline inside circle */}
        <path 
          d="M24 12L27 20H35L29 25L31 34L24 29L17 34L19 25L13 20H21L24 12Z" 
          stroke="white"
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  const renderDiamondIcon = () => (
    <div className={cn(
      currentSize.container,
      "relative rounded-2xl flex items-center justify-center transition-all duration-300",
      isActive 
        ? "bg-[#1e3a5f] shadow-lg shadow-cyan-500/20" 
        : "bg-transparent"
    )}>
      <svg viewBox="0 0 48 48" className={currentSize.icon}>
        <defs>
          <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3d1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        {/* Diamond shape - rotated square */}
        <rect 
          x="12" 
          y="12" 
          width="24" 
          height="24" 
          rx="3"
          transform="rotate(45 24 24)"
          stroke="url(#diamondGradient)"
          strokeWidth="3"
          fill="none"
        />
      </svg>
    </div>
  );

  const labels = {
    bronze: 'Bronze',
    silver: 'Silver', 
    gold: 'Gold',
    platinum: 'Platinum',
    diamond: 'Diamond'
  };

  const labelColors = {
    bronze: 'text-orange-400',
    silver: 'text-gray-400',
    gold: 'text-yellow-400',
    platinum: 'text-blue-400',
    diamond: 'text-cyan-400'
  };

  const renderIcon = () => {
    switch (level) {
      case 'bronze': return renderBronzeIcon();
      case 'silver': return renderSilverIcon();
      case 'gold': return renderGoldIcon();
      case 'platinum': return renderPlatinumIcon();
      case 'diamond': return renderDiamondIcon();
      default: return renderBronzeIcon();
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {renderIcon()}
      {showLabel && (
        <span className={cn(
          currentSize.label,
          "font-medium transition-colors",
          isActive ? labelColors[level] : "text-muted-foreground"
        )}>
          {labels[level]}
        </span>
      )}
    </div>
  );
};

export default BadgeLevelIcon;
