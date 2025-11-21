import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { trpc } from "../lib/trpc";
import { Loader2, Plus, Trash2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";

export function VerifiedCodesManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { data: codes = [], refetch } = trpc.admin.verifiedCodes.list.useQuery();

  const createMutation = trpc.admin.verifiedCodes.create.useMutation({
    onSuccess: (data) => {
      const count = data.codes?.length || 1;
      toast.success(`${count} verified code${count > 1 ? 's' : ''} created successfully`);
      setCreateDialogOpen(false);
      setQuantity("1");
      setMaxUses("1");
      setExpiresAt("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.admin.verifiedCodes.delete.useMutation({
    onSuccess: () => {
      toast.success("Verified code deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 100) {
      toast.error("Quantity must be between 1 and 100");
      return;
    }

    const maxUsesNum = parseInt(maxUses);
    if (isNaN(maxUsesNum) || maxUsesNum < 1) {
      toast.error("Max uses must be at least 1");
      return;
    }

    createMutation.mutate({
      quantity: quantityNum,
      maxUses: maxUsesNum,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this verified code?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Total codes: {codes.length} | Page {currentPage} of {Math.ceil(codes.length / itemsPerPage) || 1}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Verified Code</DialogTitle>
              <DialogDescription>
                Create a new verified code for ZenityX students
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity (1-100)</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Number of codes to generate"
                />
                <p className="text-xs text-muted-foreground">
                  Codes will be auto-generated randomly
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses per Code</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No verified codes yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              codes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((code) => {
                const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
                const isMaxedOut = code.maxUses !== null && code.usedCount >= code.maxUses;
                const isActive = !isExpired && !isMaxedOut;

                return (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-semibold">
                      {code.code}
                    </TableCell>
                    <TableCell>
                      {isActive ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Max Uses
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.usedCount} / {code.maxUses}
                    </TableCell>
                    <TableCell>
                      {code.expiresAt
                        ? new Date(code.expiresAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {code.createdAt ? new Date(code.createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(code.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {codes.length > itemsPerPage && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {Math.ceil(codes.length / itemsPerPage)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(codes.length / itemsPerPage), p + 1))}
            disabled={currentPage === Math.ceil(codes.length / itemsPerPage)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

