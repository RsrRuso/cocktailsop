import { ReactNode } from "react";

interface StatusRingProps {
  children: ReactNode;
  hasStatus: boolean;
  statusText?: string;
  emoji?: string;
  onAddClick?: () => void;
  showAddButton?: boolean;
  className?: string;
}

const StatusRing = ({ 
  children, 
  hasStatus, 
  statusText,
  emoji,
  onAddClick,
  showAddButton = false,
  className = "" 
}: StatusRingProps) => {
  return (
    <div className={`relative inline-block ${className}`}>
      {hasStatus && statusText && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-muted/95 backdrop-blur-sm text-muted-foreground px-3 py-1.5 rounded-2xl text-xs whitespace-nowrap shadow-sm">
            {emoji && <span className="mr-1">{emoji}</span>}
            {statusText}
          </div>
        </div>
      )}
      
      {children}
      
      {showAddButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddClick?.();
          }}
          className="absolute -bottom-1 -right-1 w-6 h-6 bg-background border-2 border-background rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"
        >
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-semibold">+</span>
          </div>
        </button>
      )}
    </div>
  );
};

export default StatusRing;
