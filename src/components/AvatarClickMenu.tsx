import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarClickMenuProps {
  userId: string;
  avatarUrl: string | null;
  username: string;
  hasStory?: boolean;
  children: React.ReactNode;
}

const AvatarClickMenu = ({
  userId,
  avatarUrl,
  username,
  hasStory = false,
  children,
}: AvatarClickMenuProps) => {
  const navigate = useNavigate();
  const [showProfilePicture, setShowProfilePicture] = useState(false);

  const handleViewStory = () => {
    navigate(`/story/${userId}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setShowProfilePicture(true)}>
            <User className="w-4 h-4 mr-2" />
            View Profile Picture
          </DropdownMenuItem>
          {hasStory && (
            <DropdownMenuItem onClick={handleViewStory}>
              <Eye className="w-4 h-4 mr-2" />
              View Story
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showProfilePicture} onOpenChange={setShowProfilePicture}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{username}'s Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="max-w-full max-h-[70vh] rounded-lg object-contain"
              />
            ) : (
              <Avatar className="w-64 h-64">
                <AvatarFallback className="text-6xl">
                  {username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AvatarClickMenu;
