import { differenceInYears } from "date-fns";

export interface CareerMetrics {
  workingPlaces: number;
  totalYears: number;
  projectsCompleted: number;
  diplomas: number;
  certificates: number;
  recognitions: number;
  score: number;
  badge: {
    level: string;
    color: string;
    description: string;
  };
}

export const calculateCareerScore = (
  experiences: any[],
  certifications: any[],
  recognitions: any[]
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
  
  // Calculate score (0-100)
  const workingPlacesScore = Math.min(workingPlaces * 5, 25);
  const yearsScore = Math.min(totalYears * 2, 20);
  const projectsScore = Math.min(projectsCompleted * 3, 15);
  const diplomasScore = Math.min(diplomas * 10, 20);
  const certificatesScore = Math.min(certificates * 5, 10);
  const recognitionsScore = Math.min(recognitionsCount * 10, 10);
  
  const score = workingPlacesScore + yearsScore + projectsScore + diplomasScore + certificatesScore + recognitionsScore;
  
  // Determine badge
  const badge = getBadge(score);
  
  return {
    workingPlaces,
    totalYears,
    projectsCompleted,
    diplomas,
    certificates,
    recognitions: recognitionsCount,
    score: Math.round(score),
    badge,
  };
};

const getBadge = (score: number) => {
  if (score >= 81) {
    return {
      level: "Expert",
      color: "text-purple-500",
      description: "Industry Leader",
    };
  } else if (score >= 61) {
    return {
      level: "Advanced",
      color: "text-blue-500",
      description: "Highly Skilled",
    };
  } else if (score >= 41) {
    return {
      level: "Intermediate",
      color: "text-green-500",
      description: "Experienced Professional",
    };
  } else if (score >= 21) {
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
