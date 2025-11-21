import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  User as UserIcon, Mail, Calendar, Phone, Image as ImageIcon, 
  Shield, BarChart3, Settings, LogOut, Coins, Video, Loader2,
  Camera, Check, X, AlertCircle, Lock, CreditCard
} from "lucide-react";
import { Link } from "wouter";
import { UserMenu } from "@/components/UserMenu";
import { Logo, LogoImage } from "@/components/Logo";
import { useSidebar } from "@/contexts/SidebarContext";
import { TopupModal } from "@/components/TopupModal";
import { VerifyCodeModal } from "@/components/VerifyCodeModal";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import MobileProfile from "./mobile/MobileProfile";

function DesktopProfile() {
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [verifyCodeModalOpen, setVerifyCodeModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profileData, refetch: refetchProfile } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: credits = 0 } = trpc.credits.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: generations = [] } = trpc.generations.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateProfileMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
      refetchProfile();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const checkUsernameMutation = trpc.profile.checkUsername.useQuery(
    { username },
    { enabled: false }
  );

  // Initialize form with profile data
  useEffect(() => {
    if (profileData) {
      setName(profileData.name || "");
      setUsername(profileData.username || "");
      setBio(profileData.bio || "");
      setPhone(profileData.phone || "");
      setBirthday(profileData.birthday || "");
      setProfilePicturePreview(profileData.profilePicture || "");
    }
  }, [profileData]);

  // Check username availability
  useEffect(() => {
    if (username && username !== profileData?.username && username.length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const result = await checkUsernameMutation.refetch();
          if (result.data && !result.data.available) {
            setUsernameError("Username is already taken");
          } else {
            setUsernameError("");
          }
        } catch (error) {
          console.error("Failed to check username:", error);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setUsernameError("");
    }
  }, [username, profileData?.username]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="mb-4">Please sign in to view your profile</p>
            <Button asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedGenerations = generations.filter((g) => g.status === "completed");
  const imageCount = completedGenerations.filter((g) => g.type === "image").length;
  const videoCount = completedGenerations.filter((g) => g.type === "video").length;

  const handleSaveProfile = async () => {
    if (usernameError) {
      toast.error("Please fix errors before saving");
      return;
    }

    let profilePictureUrl = profileData?.profilePicture;

    // Upload profile picture if changed
    if (profilePictureFile) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", profilePictureFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        const data = await response.json();
        profilePictureUrl = data.url;
      } catch (error) {
        toast.error("Failed to upload profile picture");
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    updateProfileMutation.mutate({
      name: name || undefined,
      username: username || undefined,
      bio: bio || undefined,
      phone: phone || undefined,
      birthday: birthday || undefined,
      profilePicture: profilePictureUrl || undefined,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original values
    if (profileData) {
      setName(profileData.name || "");
      setUsername(profileData.username || "");
      setBio(profileData.bio || "");
      setPhone(profileData.phone || "");
      setBirthday(profileData.birthday || "");
      setProfilePicturePreview(profileData.profilePicture || "");
      setProfilePictureFile(null);
    }
    setUsernameError("");
  };

  const handleProfilePictureClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const isLoading = updateProfileMutation.isPending || isUploadingImage;

  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex-1">
            {isCollapsed && <LogoImage className="h-8 w-auto" />}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border rounded-lg">
              <Coins className="h-5 w-5 text-yellow-600" />
              <span className="font-semibold">{credits}</span>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={user?.isVerified ? () => setTopupModalOpen(true) : () => setVerifyCodeModalOpen(true)}
              title={!user?.isVerified ? "สิทธิพิเศษสำหรับนักเรียนเซนนิตี้เอ็กซ์ ติดต่อขอ Verified Code / สมัครเรียนได้ที่ Messenger" : ""}
            >
              {!user?.isVerified ? (
                <Lock className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Top-up Credits
            </Button>

            {user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm">Admin</Button>
              </Link>
            )}

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Profile</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">
                <UserIcon className="h-4 w-4 mr-2" />
                Personal Info
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="statistics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistics
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Upload a profile picture to personalize your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {profilePicturePreview ? (
                          <img 
                            src={profilePicturePreview} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                      {isEditing && (
                        <button
                          onClick={handleProfilePictureClick}
                          className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Recommended: Square image, at least 400x400px
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Max file size: 5MB
                      </p>
                      {profilePictureFile && (
                        <p className="text-sm text-primary mt-2">
                          New image selected: {profilePictureFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)}>Edit</Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        disabled={!isEditing}
                        placeholder="Choose a unique username"
                      />
                      {usernameError && (
                        <div className="flex items-center gap-1 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          {usernameError}
                        </div>
                      )}
                      {username && !usernameError && username !== profileData?.username && (
                        <p className="text-sm text-green-600">Username is available</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {bio.length}/500 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!isEditing}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday">Birthday</Label>
                      <Input
                        id="birthday"
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={handleSaveProfile} 
                        className="gap-2"
                        disabled={isLoading || !!usernameError}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={handleCancelEdit} 
                        variant="outline" 
                        className="gap-2"
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Login Method</CardTitle>
                  <CardDescription>Your current authentication method</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{user?.loginMethod || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="statistics" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{credits}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available credits
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Images Created</CardTitle>
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{imageCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total image generations
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Videos Created</CardTitle>
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{videoCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total video generations
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Member Since</span>
                    <span className="font-medium">
                      {new Date(user?.createdAt || "").toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Last Sign In</span>
                    <span className="font-medium">
                      {new Date(user?.lastSignedIn || "").toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Total Generations</span>
                    <span className="font-medium">{completedGenerations.length}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how the app looks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Theme</p>
                        <p className="text-sm text-muted-foreground">
                          Choose your preferred theme
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Light</Button>
                        <Button variant="outline" size="sm">Dark</Button>
                        <Button variant="default" size="sm">System</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Manage your notification preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Generation Complete</p>
                        <p className="text-sm text-muted-foreground">
                          Notify when AI generation is complete
                        </p>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Credit Updates</p>
                        <p className="text-sm text-muted-foreground">
                          Notify when credits are added or used
                        </p>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <TopupModal
        open={topupModalOpen}
        onOpenChange={setTopupModalOpen}
      />

      <VerifyCodeModal
        open={verifyCodeModalOpen}
        onOpenChange={setVerifyCodeModalOpen}
      />
    </div>
  );
}

export default function Profile() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileProfile /> : <DesktopProfile />;
}

