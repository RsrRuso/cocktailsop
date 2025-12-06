import { Users, Circle, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface OnlineTeamMember {
  id: string;
  name: string;
  role: string;
}

interface TeamPresenceIndicatorProps {
  onlineTeam: OnlineTeamMember[];
  outletName: string;
  currentStaffName: string;
}

export default function TeamPresenceIndicator({ 
  onlineTeam, 
  outletName,
  currentStaffName 
}: TeamPresenceIndicatorProps) {
  const totalOnline = onlineTeam.length + 1; // +1 for current user
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
          <div className="relative">
            <Wifi className="w-3.5 h-3.5 text-primary" />
            <Circle className="w-2 h-2 fill-green-500 text-green-500 absolute -top-0.5 -right-0.5" />
          </div>
          <span className="text-xs font-medium text-primary">{totalOnline}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Team Online</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {outletName}
            </Badge>
          </div>
          
          {/* Current user */}
          <div className="flex items-center gap-2">
            <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
            <span className="text-sm">{currentStaffName}</span>
            <Badge variant="outline" className="ml-auto text-xs">You</Badge>
          </div>
          
          {/* Other online members */}
          {onlineTeam.length > 0 ? (
            onlineTeam.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
                <span className="text-sm">{member.name}</span>
                <Badge variant="outline" className="ml-auto text-xs capitalize">
                  {member.role}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No other team members online
            </p>
          )}
          
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              All staff in same workspace see shared orders & tables
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
