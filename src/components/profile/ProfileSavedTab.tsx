import { SavedRepostedContent } from "@/components/SavedRepostedContent";

interface ProfileSavedTabProps {
  userId: string;
}

const ProfileSavedTab = ({ userId }: ProfileSavedTabProps) => {
  return <SavedRepostedContent userId={userId} />;
};

export default ProfileSavedTab;
