import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMediaQuery";
import MobileHistory from "./mobile/MobileHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  Coins, 
  Image as ImageIcon, 
  Video, 
  Download, 
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Plus,
  Lock,
  CreditCard
} from "lucide-react";
import { Link } from "wouter";
import { UserMenu } from "@/components/UserMenu";
import { Logo, LogoImage } from "@/components/Logo";
import { useSidebar } from "@/contexts/SidebarContext";
import { TopupModal } from "@/components/TopupModal";
import { VerifyCodeModal } from "@/components/VerifyCodeModal";

import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const formatCredits = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

function DesktopHistory() {
  const { user, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [verifyCodeModalOpen, setVerifyCodeModalOpen] = useState(false);

  const { data: credits = 0 } = trpc.credits.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: models = [] } = trpc.models.list.useQuery();
  
  const { data: transactions = [] } = trpc.credits.listTransactions.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000, // Reduced from 5s to 30s for better performance
  });

  const utils = trpc.useUtils();

  const refundMutation = trpc.credits.refund.useMutation({
    onSuccess: () => {
      toast.success("Credits refunded successfully");
      utils.credits.listTransactions.invalidate();
      utils.credits.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <p className="mb-4">Please sign in to view your history</p>
            <Button asChild>
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const totalCreditsUsed = transactions
    .filter((t: any) => t.amount < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0);
  
  const totalCreditsAdded = transactions
    .filter((t: any) => t.amount > 0)
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

      <main className="flex-1 px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">History</h1>
          <p className="text-muted-foreground">
            View all your credit transactions and generation history
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{credits}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Total Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalCreditsUsed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Added
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalCreditsAdded}</div>
            </CardContent>
          </Card>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No transaction history yet</p>
              <Button asChild className="mt-4">
                <Link href="/studio">Start Creating</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Date & Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-[100px]">Credits</TableHead>
                        <TableHead className="text-right w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((transaction: any) => {
                        const isDeduction = transaction.amount < 0;
                        const isAddition = transaction.amount > 0;
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(transaction.createdAt).toLocaleDateString()}
                                </span>
                                <Badge 
                                  variant={
                                    transaction.type === 'deduction' ? 'destructive' :
                                    transaction.type === 'refund' ? 'default' :
                                    transaction.type === 'topup' ? 'default' :
                                    'secondary'
                                  }
                                  className="capitalize text-xs w-fit"
                                >
                                  {transaction.type === 'topup' ? 'Top-up' : transaction.type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {transaction.generationStatus && getStatusIcon(transaction.generationStatus)}
                                <span className="text-sm line-clamp-1">{transaction.description}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className={isDeduction ? 'text-red-600' : 'text-green-600'}>
                                {isAddition && '+'}{formatCredits(transaction.amount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Download buttons for completed generations */}
                                {transaction.type === 'deduction' && 
                                 transaction.generationStatus === 'completed' && 
                                 transaction.resultUrls && (
                                  <>
                                    {(() => {
                                      try {
                                        const urls = JSON.parse(transaction.resultUrls);
                                        if (Array.isArray(urls) && urls.length > 0) {
                                          return urls.map((url: string, idx: number) => (
                                            <Button
                                              key={idx}
                                              variant="ghost"
                                              size="icon"
                                              asChild
                                              className="h-7 w-7"
                                              title={`Download ${urls.length > 1 ? `#${idx + 1}` : 'file'}`}
                                            >
                                              <a href={url} download target="_blank" rel="noopener noreferrer">
                                                <Download className="h-3.5 w-3.5" />
                                              </a>
                                            </Button>
                                          ));
                                        }
                                      } catch (e) {
                                        // If parsing fails, try single URL
                                        if (transaction.resultUrls) {
                                          return (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              asChild
                                              className="h-7 w-7"
                                              title="Download file"
                                            >
                                              <a href={transaction.resultUrls} download target="_blank" rel="noopener noreferrer">
                                                <Download className="h-3.5 w-3.5" />
                                              </a>
                                            </Button>
                                          );
                                        }
                                      }
                                      return null;
                                    })()}
                                  </>
                                )}
                                
                                {/* Refund button for failed generations */}
                                {transaction.type === 'deduction' && 
                                 transaction.generationStatus === 'failed' && 
                                 !transaction.refunded && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (transaction.relatedGenerationId) {
                                        refundMutation.mutate({ generationId: transaction.relatedGenerationId });
                                      }
                                    }}
                                    disabled={refundMutation.isPending}
                                    className="h-7 text-xs"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Refund
                                  </Button>
                                )}
                                
                                {transaction.refunded && (
                                  <span className="text-xs text-muted-foreground">Refunded</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                      return false;
                    })
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-2">
                          {showEllipsis && <span className="text-muted-foreground">...</span>}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
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

// Wrapper component to handle mobile/desktop routing
export default function History() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileHistory />;
  }
  
  return <DesktopHistory />;
}

