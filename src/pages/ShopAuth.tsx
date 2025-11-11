import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ShopAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    // Seller-specific fields
    businessName: "",
    businessDescription: "",
    businessAddress: "",
    businessPhone: "",
  });

  const validateForm = () => {
    try {
      emailSchema.parse(formData.email);
      passwordSchema.parse(formData.password);
      
      if (!isLogin) {
        if (!formData.fullName.trim()) {
          toast({ title: "Error", description: "Full name is required", variant: "destructive" });
          return false;
        }
        if (!formData.phone.trim()) {
          toast({ title: "Error", description: "Phone number is required", variant: "destructive" });
          return false;
        }
        
        if (accountType === "buyer") {
          if (!formData.address.trim()) {
            toast({ title: "Error", description: "Address is required", variant: "destructive" });
            return false;
          }
          if (!formData.city.trim()) {
            toast({ title: "Error", description: "City is required", variant: "destructive" });
            return false;
          }
          if (!formData.country.trim()) {
            toast({ title: "Error", description: "Country is required", variant: "destructive" });
            return false;
          }
        } else {
          if (!formData.businessName.trim()) {
            toast({ title: "Error", description: "Business name is required", variant: "destructive" });
            return false;
          }
          if (!formData.businessPhone.trim()) {
            toast({ title: "Error", description: "Business phone is required", variant: "destructive" });
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Error", description: error.errors[0].message, variant: "destructive" });
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Error", description: error.message, variant: "destructive" });
          }
          return;
        }

        toast({ title: "Success!", description: "Logged in successfully" });
        
        // Check user role and redirect accordingly
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authUser.id);
          
          const isSeller = roles?.some(r => r.role === "seller");
          navigate(isSeller ? "/seller-dashboard" : "/shop");
        } else {
          navigate("/shop");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.fullName,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account Exists",
              description: "This email is already registered. Please login instead.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Error", description: error.message, variant: "destructive" });
          }
          return;
        }

        // Update profile with address information
        if (data.user) {
          // Add user role
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({
              user_id: data.user.id,
              role: accountType,
            });

          if (roleError) {
            console.error("Role creation error:", roleError);
          }

          if (accountType === "buyer") {
            const { error: profileError } = await supabase
              .from("profiles")
              .update({
                full_name: formData.fullName,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                postal_code: formData.postalCode,
                country: formData.country,
                email: formData.email,
              })
              .eq("id", data.user.id);

            if (profileError) {
              console.error("Profile update error:", profileError);
            }
          } else {
            // Create seller profile
            const { error: sellerError } = await supabase
              .from("seller_profiles")
              .insert({
                id: data.user.id,
                business_name: formData.businessName,
                business_description: formData.businessDescription,
                business_address: formData.businessAddress,
                business_phone: formData.businessPhone,
              });

            if (sellerError) {
              console.error("Seller profile error:", sellerError);
            }

            const { error: profileError } = await supabase
              .from("profiles")
              .update({
                full_name: formData.fullName,
                phone: formData.businessPhone,
                email: formData.email,
              })
              .eq("id", data.user.id);

            if (profileError) {
              console.error("Profile update error:", profileError);
            }
          }
        }

        toast({
          title: "Account Created!",
          description: `Your ${accountType} account has been created successfully`,
        });
        navigate(accountType === "seller" ? "/seller-dashboard" : "/shop");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/shop")}
          className="glass-hover p-2 rounded-2xl mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Card className="p-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <ShoppingBag className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Sign in to continue shopping"
                : "Sign up to complete your purchase"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-2 p-1 glass rounded-lg">
                <button
                  type="button"
                  onClick={() => setAccountType("buyer")}
                  className={`py-2 px-4 rounded-md font-medium transition-colors ${
                    accountType === "buyer"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  👤 Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("seller")}
                  className={`py-2 px-4 rounded-md font-medium transition-colors ${
                    accountType === "seller"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🏪 Seller
                </button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>

                {accountType === "buyer" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        placeholder="123 Main St"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          placeholder="New York"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          placeholder="10001"
                          value={formData.postalCode}
                          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        placeholder="United States"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        placeholder="My Store"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessDescription">Business Description</Label>
                      <Input
                        id="businessDescription"
                        placeholder="What do you sell?"
                        value={formData.businessDescription}
                        onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessPhone">Business Phone</Label>
                      <Input
                        id="businessPhone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.businessPhone}
                        onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessAddress">Business Address</Label>
                      <Input
                        id="businessAddress"
                        placeholder="123 Business Ave"
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShopAuth;
