import { useState } from 'react';
import { Gift, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import MobileLayout from '@/components/mobile/MobileLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { useVerificationGuard } from '@/hooks/useVerificationGuard';

/**
 * Mobile Redeem Code Page
 * Allows users to redeem invite codes for credits
 */
export default function MobileRedeem() {
  useVerificationGuard(); // Redirect if not verified
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const redeemMutation = trpc.redeemInvite.useMutation({
    onSuccess: () => {
      setResult({
        success: true,
        message: 'โค้ดถูกใช้งานเรียบร้อยแล้ว! เครดิตได้ถูกเพิ่มเข้าบัญชีของคุณ',
      });
      setCode('');
    },
    onError: (error) => {
      setResult({
        success: false,
        message: error.message || 'โค้ดไม่ถูกต้องหรือถูกใช้งานแล้ว',
      });
    },
  });

  const handleRedeem = () => {
    if (!code.trim()) {
      setResult({
        success: false,
        message: 'กรุณากรอกโค้ด',
      });
      return;
    }
    setResult(null);
    redeemMutation.mutate({ code: code.trim() });
  };

  return (
    <MobileLayout>
      <div className="min-h-full bg-background p-4">
        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mb-4">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">รีดีมโค้ด</h1>
          <p className="text-sm text-muted-foreground">
            ใส่โค้ดเพื่อรับเครดิตฟรี
          </p>
        </div>

        {/* Redeem Form */}
        <div className="max-w-md mx-auto space-y-4">
          {/* Code Input */}
          <div>
            <label className="block text-sm font-medium mb-2">โค้ด</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ใส่โค้ดของคุณ"
              className="w-full px-4 py-3 bg-muted border-0 rounded-lg text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              disabled={redeemMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRedeem();
                }
              }}
            />
          </div>

          {/* Redeem Button */}
          <Button
            onClick={handleRedeem}
            disabled={redeemMutation.isPending || !code.trim()}
            className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {redeemMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                กำลังตรวจสอบ...
              </>
            ) : (
              <>
                <Gift className="h-5 w-5 mr-2" />
                รีดีมโค้ด
              </>
            )}
          </Button>

          {/* Result Message */}
          {result && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                result.success
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}
              >
                {result.message}
              </p>
            </div>
          )}

          {/* Info Card */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
            <h3 className="text-sm font-semibold mb-2">วิธีการใช้งาน</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• ใส่โค้ดที่ได้รับจากทีมงานหรือแคมเปญ</li>
              <li>• โค้ดแต่ละตัวสามารถใช้ได้เพียงครั้งเดียว</li>
              <li>• เครดิตจะถูกเพิ่มเข้าบัญชีทันที</li>
            </ul>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

