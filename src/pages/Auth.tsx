import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

// Validation schemas
const signUpSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username is too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  fullName: z.string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 18 && age <= 120;
    }, 'You must be at least 18 years old to sign up')
});

const signInSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long')
});

const resetPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);

  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || '/home';

  // Check if user is coming from password reset link and redirect to password reset page
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      navigate('/password-reset' + window.location.hash);
    }
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        // Validate email
        const validated = resetPasswordSchema.parse({ email });

        const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
          redirectTo: `${window.location.origin}/password-reset`,
        });
        if (error) throw error;
        toast.success("Password reset link sent! Check your email");
        setIsForgotPassword(false);
      } else if (isSignUp) {
        // Check if passwords match
        if (password !== confirmPassword) {
          toast.error("Passwords don't match. Please make sure both passwords are identical.");
          setLoading(false);
          return;
        }

        // Validate signup inputs
        const validated = signUpSchema.parse({
          email,
          password,
          username,
          fullName,
          dateOfBirth
        });

        const { error, data } = await supabase.auth.signUp({
          email: validated.email,
          password: validated.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: validated.fullName,
              username: validated.username,
              date_of_birth: validated.dateOfBirth,
            },
          },
        });
        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          throw error;
        }
        toast.success("🎉 Welcome to SV! Your account has been created successfully!");
        navigate(redirectTo);
      } else {
        // Validate signin inputs
        const validated = signInSchema.parse({
          email,
          password
        });

        const { error } = await supabase.auth.signInWithPassword({
          email: validated.email,
          password: validated.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate(redirectTo);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="w-full max-w-md glass glow-primary rounded-2xl p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gradient-primary">
            SV
          </h1>
          <p className="text-muted-foreground">
            {isSignUp ? "Join the Professional Network for Beverage Industry" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && !isForgotPassword && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="glass"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="glass"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                      className="glass"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass"
                />
              </div>

              {!isForgotPassword && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="glass"
                      placeholder={isSignUp ? "Create a strong password" : "Enter password"}
                    />
                    {isSignUp && password && (
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
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="glass"
                        placeholder="Re-enter your password"
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
                  )}
                </>
              )}

          <Button
            type="submit"
            className="w-full glow-primary font-semibold"
            disabled={loading || (isSignUp && password !== confirmPassword)}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : isForgotPassword ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="text-center space-y-2">
          {isForgotPassword ? (
            <button
              onClick={() => setIsForgotPassword(false)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Back to sign in
            </button>
          ) : (
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
