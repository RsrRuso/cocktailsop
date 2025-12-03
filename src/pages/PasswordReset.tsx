import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const PasswordReset = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery token
    const checkRecoveryToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type !== 'recovery') {
        toast.error("Invalid password reset link");
        navigate('/auth');
        return;
      }

      setIsValidToken(true);
    };

    checkRecoveryToken();
  }, [navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        toast.error("Passwords don't match");
        setLoading(false);
        return;
      }

      // Validate password strength
      const validated = passwordSchema.parse(password);

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: validated
      });
      
      if (error) throw error;

      toast.success("Password updated successfully! You can now sign in with your new password.");
      
      // Navigate to auth page after successful reset
      setTimeout(() => {
        navigate('/auth');
      }, 1500);
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error(error.message || 'Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="w-full max-w-md glass glow-primary rounded-2xl p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gradient-primary">
            Reset Password
          </h1>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass"
              placeholder="Enter new password"
            />
            {password && (
              <div className="text-xs space-y-1 mt-2 p-3 glass rounded-lg border border-border/50">
                <p className="font-semibold text-foreground mb-1.5">Password strength:</p>
                <div className="space-y-1">
                  <p className={password.length >= 8 ? "text-green-500 font-medium" : "text-muted-foreground"}>
                    {password.length >= 8 ? "✓" : "○"} At least 8 characters
                  </p>
                  <p className={/[A-Z]/.test(password) ? "text-green-500 font-medium" : "text-muted-foreground"}>
                    {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter (A-Z)
                  </p>
                  <p className={/[a-z]/.test(password) ? "text-green-500 font-medium" : "text-muted-foreground"}>
                    {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter (a-z)
                  </p>
                  <p className={/[0-9]/.test(password) ? "text-green-500 font-medium" : "text-muted-foreground"}>
                    {/[0-9]/.test(password) ? "✓" : "○"} One number (0-9)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="glass"
              placeholder="Confirm new password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ Passwords don't match
              </p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="text-xs text-green-500 mt-1">
                ✓ Passwords match
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full glow-primary font-semibold"
            disabled={loading || password !== confirmPassword || !password}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Updating Password...</span>
              </div>
            ) : "Update Password"}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
