import { Cake } from "lucide-react";
import { useUserBirthday } from "@/hooks/useUserBirthday";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BirthdayBadgeProps {
  userId: string | null | undefined;
  className?: string;
}

const BirthdayBadge = ({ userId, className = "" }: BirthdayBadgeProps) => {
  const { data: birthdayData } = useUserBirthday(userId);

  if (!birthdayData?.isBirthday) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center ${className}`}>
            <Cake 
              className="w-4 h-4 text-primary animate-pulse" 
              style={{
                filter: 'drop-shadow(0 0 4px hsl(var(--primary)))'
              }}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">🎉 It's their birthday!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default BirthdayBadge;
