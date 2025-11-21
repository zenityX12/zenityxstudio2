import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Save, RefreshCw } from "lucide-react";

interface Permissions {
  tabs: string[];
  canDelete: boolean;
  canEdit: boolean;
  canCreate: boolean;
}

interface RoleConfig {
  role: "user" | "admin" | "sale";
  label: string;
  description: string;
}

const roles: RoleConfig[] = [
  {
    role: "admin",
    label: "Admin",
    description: "Full access to all features and settings",
  },
  {
    role: "sale",
    label: "Sale",
    description: "Access to sales-related features",
  },
  {
    role: "user",
    label: "User",
    description: "Standard user access",
  },
];

const availableTabs = [
  { value: "users", label: "Users Management" },
  { value: "generations", label: "Generations" },
  { value: "inviteCodes", label: "Invite Codes" },
  { value: "verifiedCodes", label: "Verified Codes" },
  { value: "apiKeys", label: "API Keys" },
  { value: "systemSettings", label: "System Settings" },
  { value: "roleManagement", label: "Role Management" },
];

export default function RoleManagement() {
  const [editingRole, setEditingRole] = useState<"user" | "admin" | "sale" | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<Permissions | null>(null);

  const { data: allPermissions, isLoading, refetch } = trpc.rolePermissions.getAll.useQuery();
  const updateMutation = trpc.rolePermissions.update.useMutation({
    onSuccess: () => {
      toast.success("Role permissions updated successfully");
      setEditingRole(null);
      setEditedPermissions(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update permissions: ${error.message}`);
    },
  });

  const handleEdit = (role: "user" | "admin" | "sale") => {
    const rolePermissions = allPermissions?.find((p) => p.role === role);
    if (rolePermissions) {
      setEditingRole(role);
      setEditedPermissions(JSON.parse(rolePermissions.permissions));
    }
  };

  const handleSave = () => {
    if (!editingRole || !editedPermissions) return;
    updateMutation.mutate({
      role: editingRole,
      permissions: editedPermissions,
    });
  };

  const handleCancel = () => {
    setEditingRole(null);
    setEditedPermissions(null);
  };

  const toggleTab = (tab: string) => {
    if (!editedPermissions) return;
    const tabs = editedPermissions.tabs.includes(tab)
      ? editedPermissions.tabs.filter((t) => t !== tab)
      : [...editedPermissions.tabs, tab];
    setEditedPermissions({ ...editedPermissions, tabs });
  };

  const togglePermission = (key: "canDelete" | "canEdit" | "canCreate") => {
    if (!editedPermissions) return;
    setEditedPermissions({ ...editedPermissions, [key]: !editedPermissions[key] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure permissions for each role
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {roles.map((roleConfig) => {
          const rolePermissions = allPermissions?.find((p) => p.role === roleConfig.role);
          const permissions: Permissions = rolePermissions
            ? JSON.parse(rolePermissions.permissions)
            : { tabs: [], canDelete: false, canEdit: false, canCreate: false };

          const isEditing = editingRole === roleConfig.role;
          const displayPermissions = isEditing ? editedPermissions : permissions;

          return (
            <Card key={roleConfig.role}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {roleConfig.label}
                      <span className="text-sm font-normal text-gray-500">
                        ({roleConfig.role})
                      </span>
                    </CardTitle>
                    <CardDescription>{roleConfig.description}</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button onClick={() => handleEdit(roleConfig.role)} variant="outline">
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Accessible Tabs */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Accessible Tabs
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {availableTabs.map((tab) => (
                      <div key={tab.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${roleConfig.role}-${tab.value}`}
                          checked={displayPermissions?.tabs.includes(tab.value)}
                          onCheckedChange={() => isEditing && toggleTab(tab.value)}
                          disabled={!isEditing}
                        />
                        <Label
                          htmlFor={`${roleConfig.role}-${tab.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {tab.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Permissions */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Action Permissions
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${roleConfig.role}-create`}
                        checked={displayPermissions?.canCreate}
                        onCheckedChange={() => isEditing && togglePermission("canCreate")}
                        disabled={!isEditing}
                      />
                      <Label
                        htmlFor={`${roleConfig.role}-create`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Can Create
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${roleConfig.role}-edit`}
                        checked={displayPermissions?.canEdit}
                        onCheckedChange={() => isEditing && togglePermission("canEdit")}
                        disabled={!isEditing}
                      />
                      <Label
                        htmlFor={`${roleConfig.role}-edit`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Can Edit
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${roleConfig.role}-delete`}
                        checked={displayPermissions?.canDelete}
                        onCheckedChange={() => isEditing && togglePermission("canDelete")}
                        disabled={!isEditing}
                      />
                      <Label
                        htmlFor={`${roleConfig.role}-delete`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Can Delete
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

