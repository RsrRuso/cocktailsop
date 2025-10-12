import { differenceInYears } from "date-fns";

export interface CareerMetrics {
  workingPlaces: number;
  totalYears: number;
  projectsCompleted: number;
  diplomas: number;
  certificates: number;
  recognitions: number;
  competitions: number;
  wins: number;
  rawScore: number; // Raw calculated score
  score: number; // Regional comparative score (capped at 99)
  regionalRank: string; // e.g., "Top 5% in Middle East"
  badge: {
    level: string;
    color: string;
    description: string;
  };
}

export const calculateCareerScore = (
  experiences: any[],
  certifications: any[],
  recognitions: any[],
  competitions: any[],
  regionalMaxScore?: number,
  userRank?: number,
  totalUsersInRegion?: number
): CareerMetrics => {
  // Count working places (non-projects)
  const workingPlaces = experiences.filter(exp => !exp.is_project).length;
  
  // Count projects
  const projectsCompleted = experiences.filter(exp => exp.is_project).length;
  
  // Calculate total years of experience
  let totalYears = 0;
  experiences.forEach(exp => {
    const startDate = new Date(exp.start_date);
    const endDate = exp.end_date ? new Date(exp.end_date) : new Date();
    const years = differenceInYears(endDate, startDate);
    totalYears += Math.max(0, years);
  });
  
  // Count diplomas and certificates
  const diplomas = certifications.filter(cert => cert.type === 'diploma').length;
  const certificates = certifications.filter(cert => cert.type === 'certificate').length;
  
  // Count recognitions
  const recognitionsCount = recognitions.length;
  
  // Count competitions and wins
  const competitionsCount = competitions.length;
  const winsCount = competitions.filter(comp => comp.result === 'won').length;
  
  // Calculate score (0-100) with adjusted weights
  const workingPlacesScore = Math.min(workingPlaces * 5, 20);
  const yearsScore = Math.min(totalYears * 2, 15);
  const projectsScore = Math.min(projectsCompleted * 3, 12);
  const diplomasScore = Math.min(diplomas * 8, 16);
  const certificatesScore = Math.min(certificates * 3, 9);
  const recognitionsScore = Math.min(recognitionsCount * 8, 8);
  const competitionsScore = Math.min(competitionsCount * 3, 10);
  const winsScore = Math.min(winsCount * 10, 10);
  
  const rawScore = workingPlacesScore + yearsScore + projectsScore + diplomasScore + certificatesScore + recognitionsScore + competitionsScore + winsScore;
  
  // Calculate regional comparative score - top scorer gets 50, never reaches 100
  let displayScore = rawScore;
  let regionalRank = "Calculating...";
  
  if (regionalMaxScore && regionalMaxScore > 0) {
    // Score relative to regional max: top scorer gets 50, others proportionally less
    displayScore = (rawScore / regionalMaxScore) * 50;
    
    // Calculate rank percentage
    if (userRank !== undefined && totalUsersInRegion && totalUsersInRegion > 0) {
      const percentile = ((totalUsersInRegion - userRank) / totalUsersInRegion) * 100;
      regionalRank = `Top ${Math.round(100 - percentile)}%`;
    }
  } else {
    // If no regional data, use raw score but cap at 50
    displayScore = Math.min((rawScore / 100) * 50, 50);
  }
  
  // Determine badge based on display score
  const badge = getBadge(displayScore);
  
  return {
    workingPlaces,
    totalYears,
    projectsCompleted,
    diplomas,
    certificates,
    recognitions: recognitionsCount,
    competitions: competitionsCount,
    wins: winsCount,
    rawScore: Math.round(rawScore),
    score: Math.round(displayScore),
    regionalRank,
    badge,
  };
};

const getBadge = (score: number) => {
  // Adjusted for max score of 50
  if (score >= 40) {
    return {
      level: "Expert",
      color: "text-purple-500",
      description: "Industry Leader",
    };
  } else if (score >= 30) {
    return {
      level: "Advanced",
      color: "text-blue-500",
      description: "Highly Skilled",
    };
  } else if (score >= 20) {
    return {
      level: "Intermediate",
      color: "text-green-500",
      description: "Experienced Professional",
    };
  } else if (score >= 10) {
    return {
      level: "Beginner",
      color: "text-yellow-500",
      description: "Building Experience",
    };
  } else {
    return {
      level: "Novice",
      color: "text-gray-500",
      description: "Starting Journey",
    };
  }
};
