import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Key, Ticket, Coins, Users, Sparkles, Edit, CheckCircle2, XCircle, Eye, DollarSign, Settings, ChevronLeft, ChevronRight, Lock, CreditCard, Activity, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { UserMenu } from "@/components/UserMenu";
import { Logo, LogoImage } from "@/components/Logo";
import { useSidebar } from "@/contexts/SidebarContext";
import { VerifiedCodesManager } from "@/components/VerifiedCodesManager";
import { TopupModal } from "@/components/TopupModal";
import { VerifyCodeModal } from "@/components/VerifyCodeModal";
import DashboardTab from "@/components/DashboardTab";
import SalesTab from "@/components/SalesTab";
import { ThumbnailManager } from "@/components/ThumbnailManager";
import RoleManagement from "@/pages/RoleManagement";

// Helper function to format credits (remove .0 if whole number)
const formatCredits = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  // If it's a whole number, don't show decimal
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function KieCreditDashboard() {
  const { data: remainingCredits, isLoading: loadingCredits } = trpc.admin.kie.getRemainingCredits.useQuery();
  const { data: dailyStats = [] } = trpc.admin.kie.getUsageStats.useQuery({ period: 'daily', days: 30 });
  const { data: usageLogs = [] } = trpc.admin.kie.getUsageLogs.useQuery({ limit: 50 });

  // Calculate today's usage
  const today = new Date().toISOString().split('T')[0];
  const todayStats = dailyStats.find(s => s.date === today);
  const todayKieCredits = todayStats?.kieCredits || 0;
  const todayUserCredits = todayStats?.userCredits || 0;

  return (
    <div className="space-y-4">
      {/* Credit Balance Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kie Credits Remaining</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingCredits ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-2xl font-bold">{remainingCredits?.credits?.toLocaleString() || 'N/A'}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Current balance from Kie API</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Kie Usage</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCredits(todayKieCredits)}</div>
            <p className="text-xs text-muted-foreground mt-1">Kie credits used today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's User Charges</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCredits(todayUserCredits)}</div>
            <p className="text-xs text-muted-foreground mt-1">Credits charged to users today</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Usage (Last 30 Days)</CardTitle>
          <CardDescription>Comparison between user charges and actual Kie credits used</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="userCredits" stroke="#8884d8" name="User Credits" />
              <Line type="monotone" dataKey="kieCredits" stroke="#82ca9d" name="Kie Credits" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Usage Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Usage Logs</CardTitle>
          <CardDescription>Latest 50 generations with credit tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>User Credits</TableHead>
                <TableHead>Kie Credits</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No usage logs found
                  </TableCell>
                </TableRow>
              ) : (
                usageLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{log.username}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.modelName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {log.userCredits}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-green-600">
                        <Coins className="h-3 w-3" />
                        {log.kieCredits}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded ${
                        log.status === 'completed' ? 'bg-green-100 text-green-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AIModelsPricingTable() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [newPrice, setNewPrice] = useState("");
  const [newKiePrice, setNewKiePrice] = useState("");
  const [pricingOptionsEdit, setPricingOptionsEdit] = useState<Record<string, string>>({});
  const [kiePricingOptionsEdit, setKiePricingOptionsEdit] = useState<Record<string, string>>({});

  const { data: models = [], refetch: refetchModels } = trpc.admin.models.list.useQuery();

  const updatePriceMutation = trpc.admin.models.updatePrice.useMutation({
    onSuccess: () => {
      toast.success("Price updated successfully");
      setEditDialogOpen(false);
      setNewPrice("");
      refetchModels();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleStatusMutation = trpc.admin.models.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("Model status updated");
      refetchModels();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEditPrice = (model: any) => {
    setSelectedModel(model);
    setNewPrice(model.costPerGeneration.toString());
    setNewKiePrice((model.kiePrice || 0).toString());
    
    // If model has pricingOptions, parse it for editing
    if (model.pricingOptions) {
      try {
        const pricing = JSON.parse(model.pricingOptions);
        const editPricing: Record<string, string> = {};
        Object.entries(pricing).forEach(([key, value]) => {
          editPricing[key] = String(value);
        });
        setPricingOptionsEdit(editPricing);
      } catch (e) {
        setPricingOptionsEdit({});
      }
    } else {
      setPricingOptionsEdit({});
    }
    
    // If model has kiePricingOptions, parse it for editing
    if (model.kiePricingOptions) {
      try {
        const pricing = JSON.parse(model.kiePricingOptions);
        const editPricing: Record<string, string> = {};
        Object.entries(pricing).forEach(([key, value]) => {
          editPricing[key] = String(value);
        });
        setKiePricingOptionsEdit(editPricing);
      } catch (e) {
        setKiePricingOptionsEdit({});
      }
    } else {
      setKiePricingOptionsEdit({});
    }
    
    setEditDialogOpen(true);
  };

  const handleSubmitPrice = () => {
    // If model has pricingOptions, update them
    if (selectedModel.pricingOptions && Object.keys(pricingOptionsEdit).length > 0) {
      // Validate all prices
      const pricing: Record<string, number> = {};
      for (const [key, value] of Object.entries(pricingOptionsEdit)) {
        const price = parseFloat(value);
        if (isNaN(price) || price < 0) {
          toast.error(`Invalid price for ${key}`);
          return;
        }
        pricing[key] = price;
      }
      
      // Validate Kie pricing options if present
      let kiePricing: Record<string, number> | undefined;
      if (Object.keys(kiePricingOptionsEdit).length > 0) {
        kiePricing = {};
        for (const [key, value] of Object.entries(kiePricingOptionsEdit)) {
          const price = parseFloat(value);
          if (isNaN(price) || price < 0) {
            toast.error(`Invalid Kie price for ${key}`);
            return;
          }
          kiePricing[key] = price;
        }
      }
      
      // Update both costPerGeneration (use first price) and pricingOptions
      const firstPrice = Object.values(pricing)[0];
      const kiePrice = parseFloat(newKiePrice);
      updatePriceMutation.mutate({ 
        id: selectedModel.id, 
        costPerGeneration: firstPrice,
        pricingOptions: JSON.stringify(pricing),
        kiePrice: isNaN(kiePrice) ? undefined : kiePrice,
        kiePricingOptions: kiePricing ? JSON.stringify(kiePricing) : undefined
      });
    } else {
      // Simple price update
      const price = parseFloat(newPrice);
      if (isNaN(price) || price < 0) {
        toast.error("Invalid price");
        return;
      }
      const kiePrice = parseFloat(newKiePrice);
      updatePriceMutation.mutate({ 
        id: selectedModel.id, 
        costPerGeneration: price,
        kiePrice: isNaN(kiePrice) ? undefined : kiePrice
      });
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    toggleStatusMutation.mutate({ id, isActive: !currentStatus });
  };

  // Group models by type and sort alphabetically
  const imageModels = models.filter(m => m.type === "image").sort((a, b) => a.name.localeCompare(b.name));
  const videoModels = models.filter(m => m.type === "video").sort((a, b) => a.name.localeCompare(b.name));

  const renderModelTable = (models: any[], category: string) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{category}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model Name</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Model ID</TableHead>
            <TableHead>Price (Credits)</TableHead>
            <TableHead>Kie Price (Credits)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No models in this category
              </TableCell>
            </TableRow>
          ) : (
            models.map((model) => (
              <TableRow key={model.id}>
                <TableCell className="font-semibold">{model.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{model.provider}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{model.modelId}</TableCell>
                <TableCell>
                  {model.pricingOptions ? (
                    <div className="space-y-1">
                      {Object.entries(JSON.parse(model.pricingOptions)).map(([duration, price]) => (
                        <div key={duration} className="flex items-center gap-1 text-sm">
                          <Coins className="h-3 w-3" />
                          <span className="font-semibold">{formatCredits(price as number)}</span>
                          <span className="text-muted-foreground">({duration})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 font-semibold">
                      <Coins className="h-3 w-3" />
                      {formatCredits(model.costPerGeneration)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {model.kiePricingOptions ? (
                    <div className="space-y-1">
                      {Object.entries(JSON.parse(model.kiePricingOptions)).map(([duration, price]) => (
                        <div key={duration} className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Coins className="h-3 w-3" />
                          <span className="font-semibold">{formatCredits(price as number)}</span>
                          <span className="text-muted-foreground">({duration})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Coins className="h-3 w-3" />
                      {formatCredits(model.kiePrice || 0)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(model.id, model.isActive)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      model.isActive
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {model.isActive ? "Active" : "Inactive"}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPrice(model)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit Price
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {renderModelTable(imageModels, "Image Generation Models")}
        {renderModelTable(videoModels, "Video Generation Models")}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Model Price</DialogTitle>
            <DialogDescription>
              Update the credit cost for {selectedModel?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedModel?.pricingOptions ? (
              // Duration-based pricing editor
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Pricing (Duration-based)</Label>
                  <div className="space-y-2">
                    {Object.entries(pricingOptionsEdit).map(([duration, price]) => (
                      <div key={duration} className="flex items-center gap-2">
                        <Label className="w-16">{duration}:</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={price}
                          onChange={(e) => setPricingOptionsEdit(prev => ({
                            ...prev,
                            [duration]: e.target.value
                          }))}
                          placeholder="Enter price"
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">credits</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Kie Price (Duration-based)</Label>
                  <div className="space-y-2">
                    {Object.entries(pricingOptionsEdit).map(([duration]) => (
                      <div key={`kie-${duration}`} className="flex items-center gap-2">
                        <Label className="w-16">{duration}:</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={kiePricingOptionsEdit[duration] || "0"}
                          onChange={(e) => setKiePricingOptionsEdit(prev => ({
                            ...prev,
                            [duration]: e.target.value
                          }))}
                          placeholder="Enter Kie price"
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">Kie credits</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is for tracking actual Kie credits used, not charged to users
                  </p>
                </div>
              </div>
            ) : (
              // Simple price editor
              <>
                <div className="space-y-2">
                  <Label>Current Price</Label>
                  <div className="text-2xl font-bold">
                    {formatCredits(selectedModel?.costPerGeneration || 0)} credits
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPrice">New Price (Credits)</Label>
                  <Input
                    id="newPrice"
                    type="number"
                    min="0"
                    step="0.1"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="Enter new price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newKiePrice">Kie Price (Credits)</Label>
                  <Input
                    id="newKiePrice"
                    type="number"
                    min="0"
                    step="0.1"
                    value={newKiePrice}
                    onChange={(e) => setNewKiePrice(e.target.value)}
                    placeholder="Enter Kie credit cost (for comparison)"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is for tracking actual Kie credits used, not charged to users
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPrice}
              disabled={updatePriceMutation.isPending}
            >
              {updatePriceMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const { isCollapsed } = useSidebar(); // Move hook to top before any conditional returns
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [verifyCodeModalOpen, setVerifyCodeModalOpen] = useState(false);

  const { data: credits = 0 } = trpc.credits.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [inviteCredits, setInviteCredits] = useState("100");
  const [inviteMaxUses, setInviteMaxUses] = useState("1");
  const [inviteQuantity, setInviteQuantity] = useState("1"); // Batch creation
  const [inviteNote, setInviteNote] = useState(""); // Note for the codes
  const [inviteExpiresAt, setInviteExpiresAt] = useState(""); // Expiration date

  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("1000");

  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditAction, setCreditAction] = useState<"add" | "set">("add");
  
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<string>("");
  
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserIdForRole, setSelectedUserIdForRole] = useState("");
  const [selectedUserRole, setSelectedUserRole] = useState<"user" | "admin" | "sale">("user");
  
  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [redeemCodesPage, setRedeemCodesPage] = useState(1);
  const itemsPerPage = 50;

  const { data: inviteCodes = [], refetch: refetchInvites } = trpc.admin.inviteCodes.list.useQuery(undefined, {
    enabled: isAuthenticated && (user?.role === "admin" || user?.role === "sale"),
  });

  const { data: apiKeys = [], refetch: refetchApiKeys } = trpc.admin.apiKeys.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin", // API Keys only for admin
  });

  const { data: users = [], refetch: refetchUsers } = trpc.admin.users.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin", // Users only for admin
  });
  
  const { data: activityLogs = [] } = trpc.admin.activityLogs.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin", // Activity logs only for admin
  });
  
  // Get user permissions - must be called before any conditional returns
  const { data: permissions } = trpc.rolePermissions.getMyPermissions.useQuery(undefined, {
    enabled: isAuthenticated && (user?.role === "admin" || user?.role === "sale"),
  });
  
  // Sort users by registration date (newest first)
  const sortedUsers = [...users].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
  
  // Fetch transaction logs for selected user
  const { data: userLogs = [] } = trpc.admin.users.getTransactions.useQuery(
    { userId: selectedUserForLogs },
    {
      enabled: isAuthenticated && user?.role === "admin" && logsDialogOpen && !!selectedUserForLogs,
    }
  );

  const createInviteMutation = trpc.admin.inviteCodes.create.useMutation({
    onSuccess: (data) => {
      if (data.quantity === 1) {
        toast.success(`Redeem code created: ${data.codes[0]}`);
      } else {
        toast.success(`${data.quantity} redeem codes created successfully`);
      }
      setInviteDialogOpen(false);
      setInviteCredits("100");
      setInviteMaxUses("1");
      setInviteQuantity("1");
      setInviteNote("");
      setInviteExpiresAt("");
      refetchInvites();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleInviteStatusMutation = trpc.admin.inviteCodes.toggleStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated successfully");
      refetchInvites();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteInviteMutation = trpc.admin.inviteCodes.delete.useMutation({
    onSuccess: () => {
      toast.success("Redeem code deleted successfully");
      refetchInvites();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createApiKeyMutation = trpc.admin.apiKeys.create.useMutation({
    onSuccess: () => {
      toast.success("API key added successfully");
      setApiKeyDialogOpen(false);
      setApiKeyName("");
      setApiKey("");
      setMonthlyBudget("1000");
      refetchApiKeys();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addCreditsMutation = trpc.admin.users.addCredits.useMutation({
    onSuccess: () => {
      toast.success("Credits added successfully");
      setCreditDialogOpen(false);
      setCreditAmount("");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setCreditsMutation = trpc.admin.users.setCredits.useMutation({
    onSuccess: () => {
      toast.success("Credits updated successfully");
      setCreditDialogOpen(false);
      setCreditAmount("");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleVerifiedMutation = trpc.admin.users.toggleVerified.useMutation({
    onSuccess: () => {
      toast.success("Verification status updated");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      setRoleDialogOpen(false);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateInvite = () => {
    const credits = parseInt(inviteCredits);
    const maxUses = parseInt(inviteMaxUses);
    const quantity = parseInt(inviteQuantity);

    if (isNaN(credits) || credits < 0) {
      toast.error("Invalid credits amount");
      return;
    }

    if (isNaN(maxUses) || maxUses < 1) {
      toast.error("Max uses must be at least 1");
      return;
    }

    if (isNaN(quantity) || quantity < 1 || quantity > 100) {
      toast.error("Quantity must be between 1 and 100");
      return;
    }

    // Parse expires date if provided
    let expiresAt: Date | undefined = undefined;
    if (inviteExpiresAt.trim()) {
      expiresAt = new Date(inviteExpiresAt);
      if (isNaN(expiresAt.getTime())) {
        toast.error("Invalid expiration date");
        return;
      }
      
      // Fix Buddhist Era (BE) to Gregorian (CE) conversion
      // If year is > 2500, it's likely Buddhist Era, subtract 543
      if (expiresAt.getFullYear() > 2500) {
        expiresAt.setFullYear(expiresAt.getFullYear() - 543);
      }
    }

    createInviteMutation.mutate({
      credits,
      maxUses,
      quantity,
      note: inviteNote.trim() || undefined,
      expiresAt,
    });
  };

  const handleCreateApiKey = () => {
    if (!apiKeyName.trim() || !apiKey.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const budget = parseInt(monthlyBudget);
    if (isNaN(budget) || budget < 0) {
      toast.error("Invalid monthly budget");
      return;
    }

    createApiKeyMutation.mutate({
      name: apiKeyName.trim(),
      apiKey: apiKey.trim(),
      monthlyBudget: budget,
    });
  };

  const handleManageCredits = (userId: string, action: "add" | "set") => {
    setSelectedUserId(userId);
    setCreditAction(action);
    setCreditAmount("");
    setCreditDialogOpen(true);
  };
  
  const handleViewLogs = (userId: string) => {
    setSelectedUserForLogs(userId);
    setLogsDialogOpen(true);
  };

  const handleToggleVerified = (userId: string, isVerified: boolean) => {
    toggleVerifiedMutation.mutate({ userId, isVerified });
  };

  const handleChangeRole = (userId: string, currentRole: string) => {
    setSelectedUserIdForRole(userId);
    setSelectedUserRole(currentRole as "user" | "admin" | "sale");
    setRoleDialogOpen(true);
  };

  const handleSubmitRoleChange = () => {
    if (!selectedUserIdForRole) return;
    updateRoleMutation.mutate({
      userId: selectedUserIdForRole,
      role: selectedUserRole,
    });
  };

  const handleSubmitCredits = () => {
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Invalid amount");
      return;
    }

    if (creditAction === "add") {
      addCreditsMutation.mutate({ userId: selectedUserId, amount });
    } else {
      setCreditsMutation.mutate({ userId: selectedUserId, amount });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to access the Admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Allow admin and sale roles
  if (user?.role !== "admin" && user?.role !== "sale") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access this page</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper functions using permissions data
  const canAccessTab = (tab: string) => permissions?.tabs.includes(tab) ?? false;
  const canDelete = permissions?.canDelete ?? false;

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

            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage invite codes, API keys, and system settings
            </p>
          </div>

          <Tabs defaultValue={canAccessTab("dashboard") ? "dashboard" : canAccessTab("verifiedCodes") ? "verified" : "dashboard"} className="w-full">
            <TabsList>
              {canAccessTab("dashboard") && (
                <TabsTrigger value="dashboard">
                  <Activity className="h-4 w-4 mr-2" />
                  Dashboard
                </TabsTrigger>
              )}
              {canAccessTab("sales") && (
                <TabsTrigger value="sales">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
              )}
              {canAccessTab("users") && (
                <TabsTrigger value="users">
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
              )}
              {canAccessTab("inviteCodes") && (
                <TabsTrigger value="invites">
                  <Ticket className="h-4 w-4 mr-2" />
                  Redeem Codes
                </TabsTrigger>
              )}
              {canAccessTab("apiKeys") && (
                <TabsTrigger value="apikeys">
                  <Key className="h-4 w-4 mr-2" />
                  API Keys
                </TabsTrigger>
              )}
              {canAccessTab("models") && (
                <TabsTrigger value="models">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Models
                </TabsTrigger>
              )}
              {canAccessTab("kie") && (
                <TabsTrigger value="kie">
                  <Coins className="h-4 w-4 mr-2" />
                  Kie Credit
                </TabsTrigger>
              )}
              {canAccessTab("verifiedCodes") && (
                <TabsTrigger value="verified">
                  <Key className="h-4 w-4 mr-2" />
                  Verified Codes
                </TabsTrigger>
              )}
              {canAccessTab("thumbnails") && (
                <TabsTrigger value="thumbnail">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Thumbnails
                </TabsTrigger>
              )}
              {canAccessTab("activity") && (
                <TabsTrigger value="activity">
                  <Activity className="h-4 w-4 mr-2" />
                  Activity Logs
                </TabsTrigger>
              )}
              {canAccessTab("systemSettings") && (
                <TabsTrigger value="system-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </TabsTrigger>
              )}
              {canAccessTab("roleManagement") && (
                <TabsTrigger value="role-management">
                  <Shield className="h-4 w-4 mr-2" />
                  Role Management
                </TabsTrigger>
              )}
            </TabsList>



            <TabsContent value="dashboard" className="space-y-4">
              <DashboardTab />
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <SalesTab />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage users and their credits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground">
                            No users yet
                          </TableCell>
                        </TableRow>
                       ) : (
                        sortedUsers.slice((usersPage - 1) * itemsPerPage, usersPage * itemsPerPage).map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-semibold">
                              {u.name || "Unknown"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {u.email || "N/A"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  u.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : u.role === "sale"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {u.role}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleVerified(u.id, !u.isVerified)}
                                className="h-8 px-2"
                              >
                                {u.isVerified ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 font-semibold">
                                <Coins className="h-3 w-3" />
                                {u.credits}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {u.creditsAdded || 0}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {u.creditsUsed || 0}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewLogs(u.id)}
                                  title="View Logs"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleChangeRole(u.id, u.role)}
                                  title="Change Role"
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleManageCredits(u.id, "add")}
                                  title="Add Credits"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleManageCredits(u.id, "set")}
                                  title="Set Credits"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                {sortedUsers.length > itemsPerPage && (
                  <CardFooter className="flex justify-center items-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {usersPage} of {Math.ceil(sortedUsers.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(p => Math.min(Math.ceil(sortedUsers.length / itemsPerPage), p + 1))}
                      disabled={usersPage === Math.ceil(sortedUsers.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                )}
              </Card>

              <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {creditAction === "add" ? "Add Credits" : "Set Credits"}
                    </DialogTitle>
                    <DialogDescription>
                      {creditAction === "add"
                        ? "Add credits to the user's account"
                        : "Set the user's total credits"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="creditAmount">Amount</Label>
                      <Input
                        id="creditAmount"
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={handleSubmitCredits}
                      disabled={addCreditsMutation.isPending || setCreditsMutation.isPending}
                    >
                      {addCreditsMutation.isPending || setCreditsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        creditAction === "add" ? "Add Credits" : "Set Credits"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* User Logs Dialog */}
              <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>User Transaction Logs</DialogTitle>
                    <DialogDescription>
                      Transaction history for {sortedUsers.find(u => u.id === selectedUserForLogs)?.name || 'user'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto">
                    {userLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No transaction logs found
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Balance After</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userLogs.map((log: any) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                {new Date(log.createdAt).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  log.type === 'deduction' ? 'bg-red-100 text-red-800' :
                                  log.type === 'topup' ? 'bg-green-100 text-green-800' :
                                  log.type === 'refund' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.type}
                                </span>
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${
                                parseFloat(log.amount) < 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {parseFloat(log.amount) > 0 ? '+' : ''}{formatCredits(log.amount)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCredits(log.balanceAfter)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                                {log.description}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Role Change Dialog */}
              <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change User Role</DialogTitle>
                    <DialogDescription>
                      Select a new role for {sortedUsers.find(u => u.id === selectedUserIdForRole)?.name || 'user'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={selectedUserRole}
                        onChange={(e) => setSelectedUserRole(e.target.value as "user" | "admin" | "sale")}
                      >
                        <option value="user">User</option>
                        <option value="sale">Sale</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitRoleChange}>
                      Update Role
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="invites" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Redeem Codes</CardTitle>
                      <CardDescription>
                        Create and manage redeem codes for users
                      </CardDescription>
                    </div>

                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Redeem Code
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Redeem Code</DialogTitle>
                          <DialogDescription>
                            Generate new redeem codes with credits
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="credits">Credits</Label>
                            <Input
                              id="credits"
                              type="number"
                              value={inviteCredits}
                              onChange={(e) => setInviteCredits(e.target.value)}
                              placeholder="100"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="maxUses">Max Uses</Label>
                            <Input
                              id="maxUses"
                              type="number"
                              value={inviteMaxUses}
                              onChange={(e) => setInviteMaxUses(e.target.value)}
                              placeholder="1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity (Batch)</Label>
                            <Input
                              id="quantity"
                              type="number"
                              value={inviteQuantity}
                              onChange={(e) => setInviteQuantity(e.target.value)}
                              placeholder="1"
                            />
                            <p className="text-xs text-muted-foreground">
                              Number of codes to create at once
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="note">Note (Optional)</Label>
                            <Input
                              id="note"
                              value={inviteNote}
                              onChange={(e) => setInviteNote(e.target.value)}
                              placeholder="e.g., For CS101 students"
                            />
                            <p className="text-xs text-muted-foreground">
                              Add a note to identify these codes
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                            <Input
                              id="expiresAt"
                              type="datetime-local"
                              value={inviteExpiresAt}
                              onChange={(e) => setInviteExpiresAt(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave empty for codes that never expire
                            </p>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            onClick={handleCreateInvite}
                            disabled={createInviteMutation.isPending}
                          >
                            {createInviteMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Redeemed By</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inviteCodes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground">
                            No redeem codes yet
                          </TableCell>
                        </TableRow>
                       ) : (
                        inviteCodes.slice((redeemCodesPage - 1) * itemsPerPage, redeemCodesPage * itemsPerPage).map((invite) => (
                          <TableRow key={invite.id}>
                            <TableCell className="font-mono font-semibold">
                              {invite.code}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Coins className="h-3 w-3" />
                                {invite.credits}
                              </div>
                            </TableCell>
                            <TableCell>
                              {invite.usedCount} / {invite.maxUses}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(invite as any).redemptions && (invite as any).redemptions.length > 0 ? (
                                <div className="space-y-1">
                                  {(invite as any).redemptions.map((r: any, idx: number) => (
                                    <div key={idx} className="text-xs">
                                      <span className="font-medium">{r.userName || 'Unknown'}</span>
                                      <span className="text-muted-foreground ml-1">({r.userEmail || 'N/A'})</span>
                                      <div className="text-muted-foreground">
                                        {new Date(r.redeemedAt).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {invite.note || '-'}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const now = new Date();
                                const isExpired = invite.expiresAt && new Date(invite.expiresAt) < now;
                                
                                if (isExpired) {
                                  return (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                      Expired
                                    </span>
                                  );
                                }
                                
                                return (
                                  <button
                                    onClick={() => toggleInviteStatusMutation.mutate({ id: invite.id })}
                                    disabled={toggleInviteStatusMutation.isPending}
                                    title={invite.isActive ? "Click to Deactivate" : "Click to Activate"}
                                    className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                                      invite.isActive
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {invite.isActive ? "Active" : "Inactive"}
                                  </button>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {invite.createdAt ? new Date(invite.createdAt).toLocaleDateString() : ''}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {user?.role === "admin" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Delete code ${invite.code}?`)) {
                                        deleteInviteMutation.mutate({ id: invite.id });
                                      }
                                    }}
                                    disabled={deleteInviteMutation.isPending}
                                    title="Delete Code"
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                {inviteCodes.length > itemsPerPage && (
                  <CardFooter className="flex justify-center items-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRedeemCodesPage(p => Math.max(1, p - 1))}
                      disabled={redeemCodesPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {redeemCodesPage} of {Math.ceil(inviteCodes.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRedeemCodesPage(p => Math.min(Math.ceil(inviteCodes.length / itemsPerPage), p + 1))}
                      disabled={redeemCodesPage === Math.ceil(inviteCodes.length / itemsPerPage)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="apikeys" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Kie AI API Keys</CardTitle>
                      <CardDescription>
                        Manage API keys for Kie.ai integration
                      </CardDescription>
                    </div>

                    <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add API Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add API Key</DialogTitle>
                          <DialogDescription>
                            Add a new Kie.ai API key for the system
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="keyName">Name</Label>
                            <Input
                              id="keyName"
                              value={apiKeyName}
                              onChange={(e) => setApiKeyName(e.target.value)}
                              placeholder="Production Key"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="apiKeyValue">API Key</Label>
                            <Input
                              id="apiKeyValue"
                              type="password"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="kie_..."
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="budget">Monthly Budget (credits)</Label>
                            <Input
                              id="budget"
                              type="number"
                              value={monthlyBudget}
                              onChange={(e) => setMonthlyBudget(e.target.value)}
                              placeholder="1000"
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            onClick={handleCreateApiKey}
                            disabled={createApiKeyMutation.isPending}
                          >
                            {createApiKeyMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add Key"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Spend</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No API keys configured
                          </TableCell>
                        </TableRow>
                      ) : (
                        apiKeys.map((key) => (
                          <TableRow key={key.id}>
                            <TableCell className="font-semibold">{key.name}</TableCell>
                            <TableCell>{key.monthlyBudget.toLocaleString()}</TableCell>
                            <TableCell>
                              {key.currentSpend.toLocaleString()} (
                              {key.monthlyBudget > 0
                                ? Math.round((key.currentSpend / key.monthlyBudget) * 100)
                                : 0}
                              %)
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  key.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {key.isActive ? "Active" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : ''}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>AI Models Pricing</CardTitle>
                  <CardDescription>
                    Manage AI model pricing and availability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AIModelsPricingTable />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kie" className="space-y-4">
              <KieCreditDashboard />
            </TabsContent>

            <TabsContent value="verified" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Verified Codes Management</CardTitle>
                  <CardDescription>
                    Create and manage verified codes for ZenityX students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VerifiedCodesManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="thumbnails" className="space-y-4">
              <ThumbnailManager />
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Logs</CardTitle>
                  <CardDescription>
                    Track actions performed by admin and sale users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No activity logs found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogs.map((log: any) => {
                          const user = users.find(u => u.id === log.userId);
                          const details = log.details ? JSON.parse(log.details) : {};
                          
                          return (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                {new Date(log.createdAt).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </TableCell>
                              <TableCell className="font-medium">
                                {user?.name || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  log.userRole === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {log.userRole}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {log.action.replace(/_/g, ' ')}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {log.targetType.replace(/_/g, ' ')}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                                {details.quantity && `Quantity: ${details.quantity}`}
                                {details.credits && ` | Credits: ${details.credits}`}
                                {details.newRole && `New Role: ${details.newRole}`}
                                {details.codes && ` | Codes: ${details.codes.slice(0, 2).join(', ')}${details.codes.length > 2 ? '...' : ''}`}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system-settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Manage API Keys and system configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    System Settings has been moved to a dedicated page for better management.
                  </p>
                  <Link href="/system-settings">
                    <Button>
                      <Settings className="h-4 w-4 mr-2" />
                      Go to System Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="role-management" className="space-y-4">
              <RoleManagement />
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

