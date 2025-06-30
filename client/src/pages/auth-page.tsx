import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { AtSign, KeyRound, User, ShoppingBag, Loader2, Mail, CheckCircle, Lock as LockIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Define the login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Define the forgot password form schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Define the reset password form schema
const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Define the registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  repCode: z.string().trim().optional(), // Optional sales rep code
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  // Check URL parameters to determine initial tab and reset token
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') === 'register' ? 'register' : 'login';
  const resetToken = urlParams.get('token');
  const isResetPasswordPage = window.location.pathname === '/reset-password';
  
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isEmailSentModalOpen, setIsEmailSentModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isEmailVerificationModalOpen, setIsEmailVerificationModalOpen] = useState(false);
  const [resetTokenData, setResetTokenData] = useState<{email: string} | null>(null);
  const [verificationEmailData, setVerificationEmailData] = useState<{email: string, username: string} | null>(null);
  const [currentResetToken, setCurrentResetToken] = useState<string | null>(resetToken);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  const navigate = (path: string) => setLocation(path);

  // Redirect to home if already logged in
  React.useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user]);

  // Handle reset password page with token validation
  React.useEffect(() => {
    if (isResetPasswordPage && currentResetToken) {
      validateTokenMutation.mutate(currentResetToken, {
        onSuccess: (response) => {
          setResetTokenData(response.data || response);
          setIsResetPasswordModalOpen(true);
        },
        onError: (error: Error) => {
          toast({
            title: "Invalid Reset Link",
            description: error.message,
            variant: "destructive",
          });
          navigate("/auth");
        },
      });
    }
  }, [isResetPasswordPage, currentResetToken]);

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      return await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });

  // Token validation mutation
  const validateTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest(`/api/auth/validate-reset-token/${token}`, {
        method: 'GET',
      });
      return await response.json();
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const response = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    },
  });

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Forgot password form
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Reset password form
  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      repCode: "",
      acceptTerms: false,
    },
  });

  // Handle login submit
  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        
        // Navigate without full page reload
        navigate("/");
      },
      onError: (error: Error) => {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  // Handle forgot password submit
  const onForgotPasswordSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data, {
      onSuccess: () => {
        setIsForgotPasswordOpen(false);
        setIsEmailSentModalOpen(true);
        forgotPasswordForm.reset();
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  // Handle reset password submit
  const onResetPasswordSubmit = (data: ResetPasswordFormData) => {
    if (!currentResetToken) return;
    
    resetPasswordMutation.mutate(
      { token: currentResetToken, password: data.password },
      {
        onSuccess: () => {
          setIsResetPasswordModalOpen(false);
          toast({
            title: "Password reset successful",
            description: "Your password has been updated. You can now sign in with your new password.",
          });
          
          // Auto-login with the email from token data
          if (resetTokenData?.email) {
            loginMutation.mutate(
              { email: resetTokenData.email, password: data.password },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
                  navigate('/');
                },
                onError: () => {
                  // If auto-login fails, just redirect to auth page
                  navigate('/auth');
                }
              }
            );
          } else {
            navigate('/auth');
          }
        },
        onError: (error: Error) => {
          toast({
            title: "Reset failed",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  // Handle register submit
  const onRegisterSubmit = (data: RegisterFormData) => {
    // Send all data including confirmPassword and acceptTerms as expected by backend
    registerMutation.mutate(data, {
      onSuccess: (response: any) => {
        // Check if email verification was sent
        if (response?.emailVerificationSent) {
          // Show email verification modal instead of navigating
          setVerificationEmailData({
            email: data.email,
            username: data.username
          });
          setIsEmailVerificationModalOpen(true);
        } else {
          // Fallback to old behavior if no verification sent
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
          navigate('/');
        }
      },
      onError: (error: Error) => {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="grid w-full gap-8 md:grid-cols-2">
        {/* Auth Forms Section */}
        <div className="flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Welcome to TeeMeYou.shop</h1>
            <p className="text-muted-foreground">
              Sign in to your account or create a new one to start shopping.
            </p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="data-[state=active]:bg-[#ff69b4] data-[state=active]:text-white">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-[#ff69b4] data-[state=active]:text-white">Register</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  <AtSign size={16} />
                                </span>
                                <Input
                                  type="email"
                                  placeholder="Enter your email address"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  <KeyRound size={16} />
                                </span>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                  
                  {/* Forgot Password Link */}
                  <div className="text-center">
                    <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                      <DialogTrigger asChild>
                        <button className="text-sm text-primary hover:underline">
                          Forgot Password?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Reset Your Password</DialogTitle>
                          <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...forgotPasswordForm}>
                          <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                            <FormField
                              control={forgotPasswordForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <AtSign size={16} />
                                      </span>
                                      <Input
                                        type="email"
                                        placeholder="Enter your email address"
                                        className="pl-10"
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsForgotPasswordOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={forgotPasswordMutation.isPending}
                              >
                                {forgotPasswordMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  "Send Reset Email"
                                )}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      onClick={() => setActiveTab("register")}
                      className="text-primary hover:underline"
                    >
                      Register here
                    </button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an Account</CardTitle>
                  <CardDescription>
                    Enter your details to create a new account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  <User size={16} />
                                </span>
                                <Input
                                  placeholder="Choose a username"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  <AtSign size={16} />
                                </span>
                                <Input
                                  type="email"
                                  placeholder="Your email address"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  <KeyRound size={16} />
                                </span>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  <KeyRound size={16} />
                                </span>
                                <Input
                                  type="password"
                                  placeholder="••••••••"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="repCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sales Rep Code (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter sales rep code if you have one"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="acceptTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="mt-1"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                I accept the terms and conditions
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending
                          ? "Creating account..."
                          : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      onClick={() => setActiveTab("login")}
                      className="text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Hero Section */}
        <div className="hidden rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 p-8 md:flex md:flex-col md:justify-center">
          <div className="text-center text-white">
            <ShoppingBag className="mx-auto mb-4 h-16 w-16" />
            <h2 className="mb-2 text-3xl font-bold">TeeMeYou
</h2>
            <h3 className="mb-6 text-xl">Your One-Stop Shop for Everything</h3>
            <div className="space-y-4">
              <p className="text-lg">✓ Shop from Local South African Suppliers</p>
              <p className="text-lg">✓ Enjoy Fast and Reliable Delivery</p>
              <p className="text-lg">✓ Discover AI-Powered Recommendations</p>
              <p className="text-lg">✓ Get Exclusive Deals and Discounts</p>
            </div>
            <Separator className="my-6 bg-white/20" />
            <p className="text-sm">Join thousands of satisfied customers shopping on TeeMeYou today!</p>
          </div>
        </div>
      </div>

      {/* Email Sent Confirmation Modal */}
      <Dialog open={isEmailSentModalOpen} onOpenChange={setIsEmailSentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Email Sent Successfully
            </DialogTitle>
            <DialogDescription>
              We've sent password reset instructions to your email address. Please check your inbox and follow the link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Check your email</p>
                  <p className="mt-1">The reset link will expire in 1 hour for security.</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Didn't receive the email? Check your spam folder or contact support.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEmailSentModalOpen(false)} className="w-full">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockIcon className="w-5 h-5 text-blue-600" />
              Create New Password
            </DialogTitle>
            <DialogDescription>
              {resetTokenData?.email && (
                <>Enter a new password for <strong>{resetTokenData.email}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your new password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  disabled={resetPasswordMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Email Verification Modal */}
      <Dialog open={isEmailVerificationModalOpen} onOpenChange={setIsEmailVerificationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Verify Your Email
            </DialogTitle>
            <DialogDescription>
              We've sent a verification email to <strong>{verificationEmailData?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Registration Successful!</p>
                <p className="text-muted-foreground">
                  Welcome to TeeMeYou, {verificationEmailData?.username}! Please check your email to verify your account.
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Check your email inbox for a verification link</li>
                <li>Click the verification link in the email</li>
                <li>Return to TeeMeYou to start shopping</li>
              </ol>
            </div>
            <div className="text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder or contact sales@teemeyou.shop for help.
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEmailVerificationModalOpen(false);
                navigate('/');
              }}
            >
              Continue to Home
            </Button>
            <Button
              onClick={() => {
                setIsEmailVerificationModalOpen(false);
                setActiveTab('login');
              }}
            >
              Go to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}