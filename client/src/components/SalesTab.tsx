import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SalesTab() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data: stats, isLoading: statsLoading } = trpc.admin.sales.statistics.useQuery({ period });
  const { data: transactionsData, isLoading: transactionsLoading } = trpc.admin.sales.transactions.useQuery({
    period,
    search,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
  });

  const transactions = transactionsData?.transactions || [];
  const totalTransactions = transactionsData?.total || 0;
  const totalPages = Math.ceil(totalTransactions / itemsPerPage);

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    loading,
    valueColor = "text-2xl"
  }: { 
    title: string; 
    value: string | number; 
    description: string; 
    icon: any; 
    loading?: boolean;
    valueColor?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className={`${valueColor} font-bold`}>{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const getPackageName = (packageId: string) => {
    const packages: Record<string, string> = {
      'package_350': '350 บาท (350 เครดิต)',
      'package_500': '500 บาท (500 เครดิต)',
      'package_1000': '1,000 บาท (1,000 เครดิต)',
    };
    return packages[packageId] || packageId;
  };

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex gap-2">
        <Button
          variant={period === 'today' ? 'default' : 'outline'}
          onClick={() => setPeriod('today')}
        >
          วันนี้
        </Button>
        <Button
          variant={period === 'week' ? 'default' : 'outline'}
          onClick={() => setPeriod('week')}
        >
          7 วันที่แล้ว
        </Button>
        <Button
          variant={period === 'month' ? 'default' : 'outline'}
          onClick={() => setPeriod('month')}
        >
          เดือนนี้
        </Button>
        <Button
          variant={period === 'all' ? 'default' : 'outline'}
          onClick={() => setPeriod('all')}
        >
          ทั้งหมด
        </Button>
      </div>

      {/* Statistics Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">สถิติการขาย</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="ยอดขายรวม"
            value={formatCurrency(stats?.totalRevenue || 0)}
            description={`${stats?.totalTransactions || 0} รายการ`}
            icon={DollarSign}
            loading={statsLoading}
            valueColor="text-xl"
          />
          <StatCard
            title="เครดิตที่ขายได้"
            value={(stats?.totalCredits || 0).toLocaleString()}
            description="เครดิตทั้งหมด"
            icon={CreditCard}
            loading={statsLoading}
          />
          <StatCard
            title="ลูกค้าทั้งหมด"
            value={stats?.uniqueCustomers || 0}
            description="ผู้ใช้ที่ซื้อเครดิต"
            icon={Users}
            loading={statsLoading}
          />
          <StatCard
            title="ค่าเฉลี่ย/รายการ"
            value={formatCurrency(
              stats?.totalTransactions && stats.totalTransactions > 0
                ? stats.totalRevenue / stats.totalTransactions
                : 0
            )}
            description="มูลค่าเฉลี่ยต่อรายการ"
            icon={TrendingUp}
            loading={statsLoading}
            valueColor="text-xl"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">รายการขาย</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อหรืออีเมล..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-8 w-[250px]"
              />
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {transactionsLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                ไม่พบรายการขาย
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่/เวลา</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>แพ็คเกจ</TableHead>
                      <TableHead className="text-right">เครดิต</TableHead>
                      <TableHead className="text-right">ยอดเงิน</TableHead>
                      <TableHead>Charge ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {formatDate(transaction.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.userName}</div>
                            <div className="text-xs text-muted-foreground">
                              {transaction.userEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getPackageName(transaction.packageId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.credits.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(transaction.amountPaid)}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {transaction.chargeId || '-'}
                          </code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-4">
                    <div className="text-sm text-muted-foreground">
                      แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalTransactions)} จาก {totalTransactions} รายการ
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        ก่อนหน้า
                      </Button>
                      <div className="text-sm">
                        หน้า {currentPage} / {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        ถัดไป
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

