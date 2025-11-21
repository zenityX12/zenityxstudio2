import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { UserMenu } from "@/components/UserMenu";
import { LogoImage } from "@/components/Logo";
import { Download, Receipt, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { generateReceipt } from "@/lib/generateReceipt";

export default function TransactionHistory() {
  const { user, isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const { data: transactions, isLoading } = trpc.credits.listTransactions.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  const handleDownloadReceipt = (transaction: any) => {
    const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
    
    generateReceipt({
      id: transaction.id,
      date: new Date(transaction.createdAt),
      amountPaid: metadata.amountPaid || 0,
      creditsReceived: transaction.amount,
      chargeId: metadata.chargeId || transaction.id,
      packageName: transaction.description,
      userName: user?.name || undefined,
      userEmail: user?.email || undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your transaction history
            </p>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter only topup transactions
  const topupTransactions = transactions?.filter((tx: any) => tx.type === "topup") || [];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Main Content */}
      <div
        className="transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarCollapsed ? "4rem" : "16rem",
        }}
      >
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="flex-1">
              {sidebarCollapsed && (
                <LogoImage className="h-8 w-auto" />
              )}
            </div>
            <div className="flex items-center gap-4">
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Transaction History</h1>
              <p className="text-muted-foreground">View your credit top-up history</p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : topupTransactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No transactions yet</p>
                  <p className="text-sm text-muted-foreground">
                    Your top-up history will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {topupTransactions.map((transaction: any) => {
                  const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
                  const date = new Date(transaction.createdAt);
                  
                  return (
                    <Card key={transaction.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Receipt className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">
                                {transaction.description}
                              </h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Date</p>
                                <p className="font-medium">
                                  {date.toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground">Amount Paid</p>
                                <p className="font-medium">
                                  ฿{metadata.amountPaid || 0}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground">Credits Received</p>
                                <p className="font-medium text-green-600">
                                  +{transaction.amount} credits
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-muted-foreground">Transaction ID</p>
                                <p className="font-mono text-xs">
                                  {metadata.chargeId || transaction.id}
                                </p>
                              </div>
                            </div>
                          </div>
                          

                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

