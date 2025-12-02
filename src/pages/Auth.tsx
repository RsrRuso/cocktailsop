import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Apple } from "lucide-react";

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

  // Memoized password validation for performance
  const passwordValidation = useMemo(() => {
    if (!isSignUp || !password) return null;
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password)
    };
  }, [password, isSignUp]);

  const passwordsMatch = useMemo(() => {
    return confirmPassword && password === confirmPassword;
  }, [password, confirmPassword]);

  const handleOAuthSignIn = useCallback(async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || `Failed to sign in with ${provider}`);
      setLoading(false);
    }
  }, [redirectTo]);

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        const validated = resetPasswordSchema.parse({ email });
        const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
          redirectTo: `${window.location.origin}/password-reset`,
        });
        if (error) throw error;
        toast.success("Password reset link sent! Check your email");
        setIsForgotPassword(false);
      } else if (isSignUp) {
        if (password !== confirmPassword) {
          toast.error("Passwords don't match. Please make sure both passwords are identical.");
          setLoading(false);
          return;
        }

        const validated = signUpSchema.parse({
          email,
          password,
          username,
          fullName,
          dateOfBirth
        });

        const { error } = await supabase.auth.signUp({
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
        const validated = signInSchema.parse({ email, password });
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
  }, [isForgotPassword, isSignUp, email, password, confirmPassword, username, fullName, dateOfBirth, redirectTo, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-30" />
      
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
                    {isSignUp && passwordValidation && (
                      <div className="text-xs space-y-1 mt-2 p-3 glass rounded-lg border border-border/50">
                        <p className="font-semibold text-foreground mb-1.5">Password strength:</p>
                        <div className="space-y-1">
                          <p className={passwordValidation.length ? "text-green-500 font-medium" : "text-muted-foreground"}>
                            {passwordValidation.length ? "✓" : "○"} At least 8 characters
                          </p>
                          <p className={passwordValidation.uppercase ? "text-green-500 font-medium" : "text-muted-foreground"}>
                            {passwordValidation.uppercase ? "✓" : "○"} One uppercase letter (A-Z)
                          </p>
                          <p className={passwordValidation.lowercase ? "text-green-500 font-medium" : "text-muted-foreground"}>
                            {passwordValidation.lowercase ? "✓" : "○"} One lowercase letter (a-z)
                          </p>
                          <p className={passwordValidation.number ? "text-green-500 font-medium" : "text-muted-foreground"}>
                            {passwordValidation.number ? "✓" : "○"} One number (0-9)
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
                      {confirmPassword && !passwordsMatch && (
                        <p className="text-xs text-red-500 mt-1">
                          ⚠️ Passwords don't match
                        </p>
                      )}
                      {passwordsMatch && (
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
            disabled={loading || (isSignUp && !passwordsMatch)}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : isForgotPassword ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {!isForgotPassword && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="glass px-3 py-1 text-muted-foreground rounded-full">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
                className="glass hover:glow-primary"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthSignIn('apple')}
                disabled={loading}
                className="glass hover:glow-primary"
              >
                <Apple className="w-5 h-5 mr-2" />
                Apple
              </Button>
            </div>
          </>
        )}

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
