import { useEffect } from "react";

export default function StaffInstall() {
  useEffect(() => {
    // Redirect to the dedicated staff PWA installation page
    window.location.href = "/staff.html";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
