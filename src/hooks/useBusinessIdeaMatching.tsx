import { useMemo } from "react";

interface BusinessIdea {
  id: string;
  category: string;
  hashtags: string[];
  stage: string;
  funding_goal?: number;
  [key: string]: any;
}

interface InvestorProfile {
  investment_focus: string[];
  industries: string[];
  preferred_stages?: string[];
  investment_range_min?: number;
  investment_range_max?: number;
}

interface MatchedIdea extends BusinessIdea {
  matchScore: number;
  matchReasons: string[];
}

export const useBusinessIdeaMatching = (
  ideas: BusinessIdea[],
  investorProfile: InvestorProfile | null
): MatchedIdea[] => {
  return useMemo(() => {
    if (!investorProfile || !ideas.length) {
      return ideas.map(idea => ({
        ...idea,
        matchScore: 0,
        matchReasons: []
      }));
    }

    const scoredIdeas = ideas.map(idea => {
      let score = 0;
      const reasons: string[] = [];

      // Match investment focus with hashtags (40 points max)
      const focusMatches = idea.hashtags?.filter((tag: string) =>
        investorProfile.investment_focus.some(focus =>
          focus.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(focus.toLowerCase())
        )
      ) || [];
      
      if (focusMatches.length > 0) {
        const focusScore = Math.min(focusMatches.length * 15, 40);
        score += focusScore;
        reasons.push(`${focusMatches.length} matching focus area${focusMatches.length > 1 ? 's' : ''}`);
      }

      // Match industry category (30 points)
      const industryMatch = investorProfile.industries.some(industry =>
        industry.toLowerCase() === idea.category?.toLowerCase() ||
        idea.category?.toLowerCase().includes(industry.toLowerCase())
      );
      
      if (industryMatch) {
        score += 30;
        reasons.push("Industry match");
      }

      // Match stage preference (20 points)
      if (investorProfile.preferred_stages?.length) {
        const stageMatch = investorProfile.preferred_stages.some(stage =>
          stage.toLowerCase() === idea.stage?.toLowerCase()
        );
        
        if (stageMatch) {
          score += 20;
          reasons.push("Stage preference match");
        }
      }

      // Match funding range (10 points)
      if (idea.funding_goal && investorProfile.investment_range_min && investorProfile.investment_range_max) {
        const withinRange = idea.funding_goal >= investorProfile.investment_range_min &&
                          idea.funding_goal <= investorProfile.investment_range_max;
        
        if (withinRange) {
          score += 10;
          reasons.push("Within investment range");
        }
      }

      return {
        ...idea,
        matchScore: score,
        matchReasons: reasons
      };
    });

    // Sort by match score (highest first)
    return scoredIdeas.sort((a, b) => b.matchScore - a.matchScore);
  }, [ideas, investorProfile]);
};

export const getMatchLevel = (score: number): {
  level: 'excellent' | 'good' | 'fair' | 'low';
  label: string;
  color: string;
} => {
  if (score >= 70) {
    return { level: 'excellent', label: 'Excellent Match', color: 'text-green-500' };
  } else if (score >= 50) {
    return { level: 'good', label: 'Good Match', color: 'text-blue-500' };
  } else if (score >= 30) {
    return { level: 'fair', label: 'Fair Match', color: 'text-yellow-500' };
  }
  return { level: 'low', label: 'Low Match', color: 'text-muted-foreground' };
};
