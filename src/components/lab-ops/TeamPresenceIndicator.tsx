import { Users, Circle, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface OnlineTeamMember {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
}

interface TeamPresenceIndicatorProps {
  onlineTeam: OnlineTeamMember[];
  outletName: string;
  currentStaffName: string;
  currentStaffUsername?: string;
  currentStaffEmail?: string;
}

export default function TeamPresenceIndicator({ 
  onlineTeam, 
  outletName,
  currentStaffName,
  currentStaffUsername,
  currentStaffEmail
}: TeamPresenceIndicatorProps) {
  const totalOnline = onlineTeam.length + 1; // +1 for current user
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20">
          <div className="relative">
            <Wifi className="w-3.5 h-3.5 text-primary" />
            <Circle className="w-2 h-2 fill-green-500 text-green-500 absolute -top-0.5 -right-0.5 animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-primary">{totalOnline} Online</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Team Online Now</span>
            <Badge variant="secondary" className="ml-auto text-xs px-2">
              {outletName}
            </Badge>
          </div>
          
          {/* Current user */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {currentStaffName[0]?.toUpperCase()}
                </span>
              </div>
              <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500 absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              {currentStaffUsername && (
                <p className="font-bold text-sm text-primary truncate">@{currentStaffUsername}</p>
              )}
              <p className="font-semibold text-sm truncate">{currentStaffName}</p>
              {currentStaffEmail && (
                <p className="text-xs text-muted-foreground truncate">{currentStaffEmail}</p>
              )}
            </div>
            <Badge variant="default" className="text-xs shrink-0">You</Badge>
          </div>
          
          {/* Other online members */}
          {onlineTeam.length > 0 ? (
            <div className="space-y-2">
              {onlineTeam.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {member.name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500 absolute -bottom-0.5 -right-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {member.username && (
                      <p className="font-bold text-sm text-primary truncate">@{member.username}</p>
                    )}
                    <p className="font-medium text-sm truncate">{member.name}</p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No other team members online
            </p>
          )}
          
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground text-center">
              All staff in same workspace see shared orders & tables
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
