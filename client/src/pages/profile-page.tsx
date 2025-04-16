import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  User, 
  Upload, 
  CreditCard, 
  Shield, 
  Check, 
  Calendar, 
  Lock, 
  Mail, 
  UserCircle
} from 'lucide-react';
import { Link } from 'wouter';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { 
    activeSubscription, 
    activePlan, 
    getSubscriptionStatus, 
    refreshSubscription,
    isLoading: subscriptionLoading 
  } = useSubscription();
  
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    profileImageUrl: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [uploadImageUrl, setUploadImageUrl] = useState('');
  const [uploadImageOpen, setUploadImageOpen] = useState(false);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        bio: user.bio || '',
        profileImageUrl: user.profileImageUrl || ''
      });
    }
  }, [user]);

  // Format subscription end date
  const formatSubscriptionDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle profile form changes
  const handleProfileChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  // Handle password form changes
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Update user profile
  const updateProfile = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('PATCH', '/api/profile', profileData);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'An error occurred while updating your profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async () => {
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Passwords Don\'t Match',
        description: 'New password and confirmation do not match',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/profile/change-password', passwordData);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Close dialog
      setChangePasswordOpen(false);
      
      toast({
        title: 'Password Changed',
        description: 'Your password has been changed successfully',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'An error occurred while updating your password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload profile image
  const uploadProfileImage = async () => {
    if (!uploadImageUrl) {
      toast({
        title: 'No Image URL',
        description: 'Please enter an image URL',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/profile/image', { 
        profileImageUrl: uploadImageUrl 
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }
      
      // Update local state with new image
      setProfileData(prev => ({ ...prev, profileImageUrl: uploadImageUrl }));
      
      // Reset form and close dialog
      setUploadImageUrl('');
      setUploadImageOpen(false);
      
      toast({
        title: 'Image Updated',
        description: 'Your profile image has been updated successfully',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'An error occurred while uploading your image',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user) return 'U';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  // Check if subscription is active
  const hasActiveSubscription = (): boolean => {
    return Boolean(activeSubscription && activeSubscription.status === 'active');
  };

  // Get subscription end date in readable format
  const getSubscriptionEndDate = () => {
    if (!activeSubscription?.currentPeriodEnd) return '';
    
    return formatSubscriptionDate(activeSubscription.currentPeriodEnd);
  };

  // Show loading state while data is loading
  if (authLoading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p>Loading profile information...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h2 className="text-2xl font-bold mb-4">Not Authenticated</h2>
        <p className="mb-6">Please log in to view your profile.</p>
        <Link href="/auth">
          <Button>Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left sidebar with profile overview */}
        <div className="w-full md:w-1/3">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileData.profileImageUrl} alt={user.firstName} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mb-4"
                onClick={() => setUploadImageOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              <CardTitle className="text-xl">
                {user.firstName} {user.lastName}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {user.email}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Subscription</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={getSubscriptionStatus() === 'free' ? 'outline' : 'default'}>
                      {activePlan?.name || 'Free'}
                    </Badge>
                    {hasActiveSubscription() && activeSubscription?.cancelAtPeriodEnd && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Cancels on {getSubscriptionEndDate()}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {profileData.bio ? (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Bio</h3>
                    <p className="text-sm">{profileData.bio}</p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Add a bio to tell others about yourself
                  </div>
                )}
                
                <div className="pt-2">
                  <Link href="/subscription">
                    <Button variant="outline" size="sm" className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right content with tabs for different settings */}
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="account">
            <TabsList className="mb-4">
              <TabsTrigger value="account">
                <User className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger value="subscription">
                <Shield className="h-4 w-4 mr-2" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="security">
                <Lock className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Update your personal details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      placeholder="Tell us about yourself"
                      value={profileData.bio || ''}
                      onChange={handleProfileChange}
                      rows={4}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={updateProfile} 
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="subscription" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Details</CardTitle>
                  <CardDescription>
                    Manage your subscription plan and billing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscriptionLoading ? (
                    <p>Loading subscription information...</p>
                  ) : (
                    <>
                      <div className="bg-primary/5 p-4 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Current Plan</h3>
                          <Badge variant={getSubscriptionStatus() === 'free' ? 'outline' : 'default'}>
                            {activePlan?.name || 'Free'}
                          </Badge>
                        </div>
                        
                        {hasActiveSubscription() ? (
                          <>
                            <div className="flex items-start gap-3 mt-4">
                              <Calendar className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <h4 className="font-medium">Billing Period</h4>
                                {activeSubscription?.cancelAtPeriodEnd ? (
                                  <p className="text-sm text-yellow-600">
                                    Your subscription will cancel on {getSubscriptionEndDate()}
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    Next billing date: {getSubscriptionEndDate()}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3 mt-4">
                              <Shield className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <h4 className="font-medium">Features</h4>
                                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                                  {activePlan?.features.map((feature, i) => (
                                    <li key={i} className="flex items-center">
                                      <Check className="h-3.5 w-3.5 text-primary mr-1.5" />
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground mt-2">
                            You are currently on the free plan. Upgrade to access premium features.
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-center mt-6">
                        <Link href="/subscription">
                          <Button variant="outline">
                            <CreditCard className="h-4 w-4 mr-2" />
                            {hasActiveSubscription() ? 'Manage Subscription' : 'View Plans'}
                          </Button>
                        </Link>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Password</h3>
                        <p className="text-sm text-muted-foreground">
                          Change your account password
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => setChangePasswordOpen(true)} variant="outline">
                      Update
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Email Address</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Link href="#account">
                      <Button variant="outline">Change</Button>
                    </Link>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Account Status</h3>
                        <p className="text-sm text-muted-foreground">
                          Your account is active
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangePasswordOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={changePassword} 
              disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Profile Image Dialog */}
      <Dialog open={uploadImageOpen} onOpenChange={setUploadImageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Profile Image</DialogTitle>
            <DialogDescription>
              Enter the URL of your profile image.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/your-image.jpg"
                value={uploadImageUrl}
                onChange={(e) => setUploadImageUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a valid URL for your profile image. Recommended size: 200x200 pixels.
              </p>
            </div>
            
            {uploadImageUrl && (
              <div className="flex justify-center">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={uploadImageUrl} alt="Preview" />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadImageOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={uploadProfileImage} 
              disabled={loading || !uploadImageUrl}
            >
              {loading ? 'Uploading...' : 'Upload Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}