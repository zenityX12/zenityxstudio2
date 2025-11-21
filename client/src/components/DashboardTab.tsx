import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  UserCheck, 
  Gift, 
  CreditCard, 
  Image as ImageIcon, 
  Video, 
  Activity,
  Database,
  CheckCircle2,
  TrendingUp,
  Coins,
  TrendingDown,
  Wallet
} from "lucide-react";

export default function DashboardTab() {
  const { data: overview, isLoading: overviewLoading } = trpc.admin.dashboard.overview.useQuery();
  const { data: aiUsage, isLoading: aiUsageLoading } = trpc.admin.dashboard.aiUsage.useQuery();
  const { data: resources, isLoading: resourcesLoading } = trpc.admin.dashboard.resources.useQuery();

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    loading 
  }: { 
    title: string; 
    value: string | number; 
    description: string; 
    icon: any; 
    loading?: boolean;
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
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Today's Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4">ภาพรวมวันนี้</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="สมาชิกใหม่"
            value={overview?.newMembersToday || 0}
            description="สมาชิกที่สมัครวันนี้"
            icon={Users}
            loading={overviewLoading}
          />
          <StatCard
            title="ยืนยันตัวตน"
            value={overview?.verificationsToday || 0}
            description="ผู้ใช้ที่ยืนยันวันนี้"
            icon={UserCheck}
            loading={overviewLoading}
          />
          <StatCard
            title="Redeem Code"
            value={overview?.redemptionsToday || 0}
            description="โค้ดที่ถูกใช้วันนี้"
            icon={Gift}
            loading={overviewLoading}
          />
          <StatCard
            title="ซื้อเครดิต"
            value={overview?.topupsToday || 0}
            description={`${overview?.topupCreditsToday || 0} เครดิต`}
            icon={CreditCard}
            loading={overviewLoading}
          />
        </div>
      </div>

      {/* Credit Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">สถิติเครดิต</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="เครดิตรวมที่ขายได้"
            value={overview?.totalCreditsSold?.toLocaleString() || 0}
            description="เครดิตจาก topup ทั้งหมด"
            icon={Coins}
            loading={overviewLoading}
          />
          <StatCard
            title="เครดิตที่ใช้ไปแล้ว"
            value={overview?.totalCreditsUsed?.toLocaleString() || 0}
            description="เครดิตที่ใช้สร้าง AI"
            icon={TrendingDown}
            loading={overviewLoading}
          />
          <StatCard
            title="เครดิตคงเหลือในระบบ"
            value={overview?.remainingCredits?.toLocaleString() || 0}
            description="รวม balance ของ users"
            icon={Wallet}
            loading={overviewLoading}
          />
        </div>
      </div>

      {/* AI Usage */}
      <div>
        <h3 className="text-lg font-semibold mb-4">การใช้งาน AI วันนี้</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="สร้างภาพ"
            value={aiUsage?.imagesToday || 0}
            description="ภาพที่สร้างสำเร็จวันนี้"
            icon={ImageIcon}
            loading={aiUsageLoading}
          />
          <StatCard
            title="สร้างวีดีโอ"
            value={aiUsage?.videosToday || 0}
            description="วีดีโอที่สร้างสำเร็จวันนี้"
            icon={Video}
            loading={aiUsageLoading}
          />
          <StatCard
            title="Active Users"
            value={aiUsage?.activeUsersToday || 0}
            description="ผู้ใช้ที่ใช้งานวันนี้"
            icon={Activity}
            loading={aiUsageLoading}
          />
          <StatCard
            title="Model ยอดนิยม"
            value={aiUsage?.popularModel || 'N/A'}
            description={`ใช้งาน ${aiUsage?.popularModelCount || 0} ครั้ง`}
            icon={TrendingUp}
            loading={aiUsageLoading}
          />
        </div>
      </div>

      {/* Resources */}
      <div>
        <h3 className="text-lg font-semibold mb-4">ทรัพยากรระบบ</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Generations ทั้งหมด"
            value={resources?.totalGenerations || 0}
            description="จำนวนการสร้างทั้งหมด"
            icon={Database}
            loading={resourcesLoading}
          />
          <StatCard
            title="สำเร็จ"
            value={resources?.completedGenerations || 0}
            description="การสร้างที่สำเร็จ"
            icon={CheckCircle2}
            loading={resourcesLoading}
          />
          <StatCard
            title="ผู้ใช้ทั้งหมด"
            value={resources?.totalUsers || 0}
            description="สมาชิกทั้งหมดในระบบ"
            icon={Users}
            loading={resourcesLoading}
          />
          <StatCard
            title="ยืนยันแล้ว"
            value={resources?.verifiedUsers || 0}
            description="ผู้ใช้ที่ยืนยันตัวตน"
            icon={UserCheck}
            loading={resourcesLoading}
          />
        </div>
      </div>
    </div>
  );
}
