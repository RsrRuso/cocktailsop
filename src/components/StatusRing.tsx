import { ReactNode } from "react";

interface StatusRingProps {
  children: ReactNode;
  hasStatus: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const StatusRing = ({ children, hasStatus, size = "md", className = "" }: StatusRingProps) => {
  if (!hasStatus) {
    return <>{children}</>;
  }

  const sizeClasses = {
    sm: "p-[2px]",
    md: "p-[3px]",
    lg: "p-[4px]",
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 ${className}`}>
      <div className="bg-background rounded-full p-[2px]">
        {children}
      </div>
    </div>
  );
};

export default StatusRing;
