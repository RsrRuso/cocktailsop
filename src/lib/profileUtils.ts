import { Wine, Briefcase, Warehouse, Truck, Building2 } from "lucide-react";

export const getBadgeColor = (level: string) => {
  const colors = {
    bronze: "from-amber-700 to-amber-500",
    silver: "from-gray-400 to-gray-200",
    gold: "from-yellow-500 to-yellow-300",
    platinum: "from-blue-400 to-purple-500",
  };
  return colors[level as keyof typeof colors] || colors.bronze;
};

export const getProfessionalBadge = (title: string | null) => {
  if (!title) return { icon: Briefcase, gradient: "from-pink-600 to-orange-500", score: 0 };
  
  const badges: Record<string, { icon: any; gradient: string; score: number }> = {
    mixologist: { icon: Wine, gradient: "from-pink-600 to-orange-500", score: 94 },
    bartender: { icon: Wine, gradient: "from-blue-600 to-purple-500", score: 88 },
    sommelier: { icon: Wine, gradient: "from-orange-600 to-amber-700", score: 96 },
    bar_manager: { icon: Warehouse, gradient: "from-pink-500 to-orange-600", score: 92 },
    beverage_director: { icon: Building2, gradient: "from-purple-600 to-pink-500", score: 95 },
    consultant: { icon: Briefcase, gradient: "from-green-600 to-teal-500", score: 90 },
    brand_ambassador: { icon: Building2, gradient: "from-yellow-600 to-orange-500", score: 87 },
    manufacturer: { icon: Warehouse, gradient: "from-blue-600 to-cyan-500", score: 85 },
    distributor: { icon: Truck, gradient: "from-purple-600 to-indigo-500", score: 83 },
    investor: { icon: Building2, gradient: "from-green-600 to-emerald-600", score: 91 },
  };
  
  return badges[title] || { icon: Briefcase, gradient: "from-pink-600 to-orange-500", score: 75 };
};

interface Post {
  like_count: number;
  comment_count: number;
}

interface Reel {
  view_count: number;
}

interface Profile {
  follower_count: number;
  following_count: number;
  badge_level: string;
  professional_title: string | null;
}

interface UserRoles {
  isFounder: boolean;
  isVerified: boolean;
}

export const calculateNetworkReach = (
  profile: Profile,
  posts: Post[],
  reels: Reel[]
) => {
  const followerReach = profile.follower_count * 1.5;
  const followingReach = profile.following_count * 0.5;
  const totalPostEngagement = posts.reduce((sum, post) => sum + (post.like_count || 0) + (post.comment_count || 0), 0);
  const postEngagementBonus = Math.min(totalPostEngagement * 0.3, 500);
  const totalReelViews = reels.reduce((sum, reel) => sum + (reel.view_count || 0), 0);
  const reelViewBonus = Math.min(totalReelViews * 0.1, 300);
  
  return Math.round(followerReach + followingReach + postEngagementBonus + reelViewBonus);
};

export const calculateProfessionalScore = (
  profile: Profile,
  userRoles: UserRoles,
  posts: Post[],
  reels: Reel[],
  stories: any[]
) => {
  const baseScore = getProfessionalBadge(profile.professional_title).score * 0.6;
  
  let statusBonus = 0;
  if (userRoles.isFounder) statusBonus += 10;
  if (userRoles.isVerified) statusBonus += 8;
  
  const badgeBonus = {
    bronze: 0,
    silver: 5,
    gold: 10,
    platinum: 15
  }[profile.badge_level as string] || 0;
  
  const avgPostEngagement = posts.length > 0 
    ? posts.reduce((sum, post) => sum + (post.like_count || 0) + (post.comment_count || 0), 0) / posts.length 
    : 0;
  const engagementScore = Math.min(avgPostEngagement * 0.5, 10);
  
  let activityBonus = 0;
  if (posts.length > 0) activityBonus += 3;
  if (reels.length > 0) activityBonus += 3;
  if (stories.length > 0) activityBonus += 2;
  
  return Math.min(Math.round(baseScore + statusBonus + badgeBonus + engagementScore + activityBonus), 100);
};
