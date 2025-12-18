import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerifiedBadge = ({ size = 'sm', className }: VerifiedBadgeProps) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const checkSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <div 
      className={cn(
        "relative flex-shrink-0 inline-flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      title="Verified User"
    >
      {/* Scalloped badge background */}
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-full h-full drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]"
      >
        {/* Scalloped circle path */}
        <path
          d="M12 2L14.09 3.26L16.5 2.94L17.77 5.05L20.09 5.77L19.77 8.18L21.86 9.77L20.6 11.86L21.86 14.23L19.77 15.82L20.09 18.23L17.77 18.95L16.5 21.06L14.09 20.74L12 22L9.91 20.74L7.5 21.06L6.23 18.95L3.91 18.23L4.23 15.82L2.14 14.23L3.4 11.86L2.14 9.77L4.23 8.18L3.91 5.77L6.23 5.05L7.5 2.94L9.91 3.26L12 2Z"
          fill="url(#verifiedGradient)"
          stroke="#B8860B"
          strokeWidth="0.5"
        />
        <defs>
          <linearGradient id="verifiedGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Checkmark */}
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className={cn("absolute", checkSizes[size])}
      >
        <path
          d="M5 12L10 17L20 7"
          stroke="#422006"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default VerifiedBadge;
