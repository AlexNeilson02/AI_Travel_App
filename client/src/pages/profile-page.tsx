import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Layout, ContentContainer } from '@/components/layout';
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
  UserCircle,
  Home,
  Archive,
  Download,
  RefreshCw,
  Loader2,
  MapPin,
  DollarSign
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Trip } from '@shared/schema';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
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
  
  // Get archived trips
  const { data: archivedTrips, isLoading: archivedTripsLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips/archived"],
    enabled: !!user,
  });
  
  // Unarchive a trip
  const unarchiveMutation = useMutation({
    mutationFn: async (tripId: number) => {
      await apiRequest("POST", `/api/trips/${tripId}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Success",
        description: "Trip unarchived successfully and moved back to My Trips.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to unarchive trip",
        variant: "destructive",
      });
    }
  });
  
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDialogView, setImageDialogView] = useState<'preview' | 'upload'>('preview');
  const [isResizingImage, setIsResizingImage] = useState(false);

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

  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  // Resize image to reduce file size
  const resizeImage = (file: File, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      setIsResizingImage(true);
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }
          
          // Create canvas and resize
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Get resized image as data URL
          const resizedDataUrl = canvas.toDataURL(file.type || 'image/jpeg', 0.85);
          setIsResizingImage(false);
          resolve(resizedDataUrl);
        };
        
        img.onerror = () => {
          setIsResizingImage(false);
          reject(new Error('Error loading image'));
        };
      };
      
      reader.onerror = (error) => {
        setIsResizingImage(false);
        reject(error);
      };
    });
  };

  // Upload profile image
  const uploadProfileImage = async () => {
    setLoading(true);
    
    try {
      let imageUrl = '';
      
      if (selectedFile) {
        // Resize the image to reduce file size
        try {
          // For files larger than 1MB, resize the image to reduce file size
          if (selectedFile.size > 1024 * 1024) {
            toast({
              title: 'Resizing Image',
              description: 'Optimizing image size for upload...',
            });
            
            // Resize to 800x800 max dimensions
            imageUrl = await resizeImage(selectedFile, 800, 800);
          } else {
            // For smaller files, just convert to base64
            imageUrl = await fileToBase64(selectedFile);
          }
        } catch (resizeError) {
          console.error('Error resizing image:', resizeError);
          // Fallback to original file if resizing fails
          imageUrl = await fileToBase64(selectedFile);
        }
      } else if (uploadImageUrl) {
        imageUrl = uploadImageUrl;
      } else {
        toast({
          title: 'No Image Selected',
          description: 'Please select an image file or enter an image URL',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Show loading message for large files
      if (imageUrl.length > 500000) {
        toast({
          title: 'Uploading Large Image',
          description: 'This may take a moment. Please wait...',
        });
      }
      
      const response = await apiRequest('POST', '/api/profile/image', { 
        profileImageUrl: imageUrl 
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }
      
      // Update local state with new image
      setProfileData(prev => ({ ...prev, profileImageUrl: imageUrl }));
      
      // Reset form and close dialog
      setUploadImageUrl('');
      setSelectedFile(null);
      setPreviewUrl(null);
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
      setIsResizingImage(false);
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
  
  // Generate PDF for archived trips
  const generatePDF = async (trip: Trip) => {
    const pdf = new jsPDF();
    let yPos = 20;
    const lineHeight = 10;

    // Title and Basic Info
    pdf.setFontSize(20);
    pdf.text(trip.title, 20, yPos);
    yPos += lineHeight * 2;

    pdf.setFontSize(12);
    pdf.text(`Destination: ${trip.destination}`, 20, yPos);
    yPos += lineHeight;

    // Fix date display in PDF
    const startDate = parseISO(trip.startDate);
    const endDate = parseISO(trip.endDate);
    pdf.text(`Dates: ${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`, 20, yPos);
    yPos += lineHeight;
    pdf.text(`Budget: $${trip.budget}`, 20, yPos);
    yPos += lineHeight * 2;

    // Itinerary
    if (trip.itinerary?.days) {
      pdf.setFontSize(16);
      pdf.text("Daily Itinerary", 20, yPos);
      yPos += lineHeight;
      pdf.setFontSize(12);

      trip.itinerary.days.forEach((day: any) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFontSize(14);
        const dayDate = parseISO(day.date);
        pdf.text(format(dayDate, "EEEE, MMMM d, yyyy"), 20, yPos);
        yPos += lineHeight;
        pdf.setFontSize(12);

        day.activities.timeSlots.forEach((slot: any) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`• ${slot.time} - ${slot.activity}`, 30, yPos);
          yPos += lineHeight;
          if (slot.location) {
            pdf.text(`  Location: ${slot.location}`, 35, yPos);
            yPos += lineHeight;
          }
        });
        yPos += lineHeight;
      });
    }

    pdf.save(`${trip.title.replace(/\s+/g, '_')}_itinerary.pdf`);
    toast({
      title: "Success",
      description: "Trip details downloaded as PDF",
    });
  };

  // Show loading state while data is loading
  if (authLoading) {
    return (
      <Layout>
        <ContentContainer className="py-10 text-center">
          <p>Loading profile information...</p>
        </ContentContainer>
      </Layout>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Layout>
        <ContentContainer className="py-10 text-center">
          <h2 className="text-2xl font-bold mb-4">Not Authenticated</h2>
          <p className="mb-6">Please log in to view your profile.</p>
          <Link href="/auth">
            <Button>Go to Login</Button>
          </Link>
        </ContentContainer>
      </Layout>
    );
  }

  return (
    <Layout>
      <ContentContainer className="py-10">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">My Profile</h1>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" asChild>
              <Link href="/my-trips">
                <Calendar className="h-4 w-4 mr-2" />
                My Trips
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar with profile overview */}
          <div className="w-full md:w-1/3">
            <Card>
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-4">
                  <div 
                    className="cursor-pointer relative group" 
                    onClick={() => {
                      setImageDialogView(profileData.profileImageUrl ? 'preview' : 'upload');
                      setUploadImageOpen(true);
                    }}
                  >
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profileData.profileImageUrl} alt={user.firstName} />
                      <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 flex items-center justify-center group-hover:opacity-100 transition-opacity">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
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
                <TabsTrigger value="archive">
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
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
                            <Button variant="default">
                              <CreditCard className="h-4 w-4 mr-2" />
                              {hasActiveSubscription() ? 'Manage Subscription' : 'Upgrade Plan'}
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
              
              <TabsContent value="archive" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Archived Trips</CardTitle>
                    <CardDescription>
                      Access and manage your archived trips
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {archivedTripsLoading ? (
                      <div className="py-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading archived trips...</p>
                      </div>
                    ) : !archivedTrips?.length ? (
                      <div className="py-8 text-center">
                        <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No archived trips</h3>
                        <p className="text-muted-foreground mb-4">
                          You haven't archived any trips yet. Archived trips will appear here.
                        </p>
                        <Button asChild variant="outline">
                          <Link href="/my-trips">Go to My Trips</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {archivedTrips.map((trip) => (
                          <div key={trip.id} className="border rounded-lg p-4 transition-colors hover:bg-accent/5">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-medium text-lg">{trip.title}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="flex items-center text-sm text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 mr-1" />
                                    {trip.destination}
                                  </span>
                                  <span className="flex items-center text-sm text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                    {format(parseISO(trip.startDate), "MMM d")} - {format(parseISO(trip.endDate), "MMM d, yyyy")}
                                  </span>
                                  <span className="flex items-center text-sm text-muted-foreground">
                                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                                    ${trip.budget}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => generatePDF(trip)}
                                  title="Download PDF"
                                  className="flex gap-2 items-center"
                                >
                                  <Download className="h-4 w-4" />
                                  PDF
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => unarchiveMutation.mutate(trip.id)}
                                  disabled={unarchiveMutation.isPending}
                                  title="Restore trip to My Trips"
                                  className="flex gap-2 items-center"
                                >
                                  {unarchiveMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                  Restore
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Profile Picture</DialogTitle>
              <DialogDescription>
                {imageDialogView === 'preview' 
                  ? 'Your profile picture is visible to other users'
                  : 'Upload a new profile picture from your computer or enter a URL'
                }
              </DialogDescription>
            </DialogHeader>
            
            {imageDialogView === 'preview' && profileData.profileImageUrl ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative max-w-full max-h-[70vh] overflow-hidden rounded-lg">
                  <img 
                    src={profileData.profileImageUrl} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="object-contain"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setImageDialogView('upload')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change Photo
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center w-full">
                    <label 
                      htmlFor="dropzone-file" 
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-background/50 border-border"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SVG, PNG, JPG or GIF (MAX. 10MB)
                        </p>
                      </div>
                      {previewUrl && (
                        <div className="relative w-full h-full">
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <input 
                        id="dropzone-file" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Or enter an image URL</Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/image.jpg"
                      value={uploadImageUrl}
                      onChange={(e) => setUploadImageUrl(e.target.value)}
                      disabled={!!selectedFile}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              {imageDialogView === 'preview' ? (
                <Button 
                  variant="outline" 
                  onClick={() => setUploadImageOpen(false)}
                >
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (profileData.profileImageUrl) {
                        setImageDialogView('preview');
                      } else {
                        setUploadImageOpen(false);
                      }
                    }}
                    disabled={loading || isResizingImage}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={uploadProfileImage} 
                    disabled={loading || isResizingImage || (!selectedFile && !uploadImageUrl)}
                  >
                    {loading || isResizingImage ? 'Processing...' : 'Upload'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ContentContainer>
    </Layout>
  );
}