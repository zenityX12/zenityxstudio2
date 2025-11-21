import { useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

/**
 * Mobile Verification Page
 * Requires users to enter verification code before accessing features
 */
export default function MobileVerify() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [, setLocation] = useLocation();

  const verifyMutation = trpc.verifiedCode.verify.useMutation({
    onSuccess: (data) => {
      setResult({
        success: true,
        message: data.message || 'ยืนยันตัวตนสำเร็จ!',
      });
      // Redirect to feed after 2 seconds
      setTimeout(() => {
        setLocation('/');
      }, 2000);
    },
    onError: (error) => {
      setResult({
        success: false,
        message: error.message || 'รหัสไม่ถูกต้องหรือถูกใช้งานแล้ว',
      });
    },
  });

  const handleVerify = () => {
    if (!code.trim()) {
      setResult({
        success: false,
        message: 'กรุณากรอกรหัสยืนยันตัวตน',
      });
      return;
    }
    setResult(null);
    verifyMutation.mutate({ code: code.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4">
      {/* Logo/Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mb-4 shadow-lg">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">ยืนยันตัวตน</h1>
        <p className="text-muted-foreground">
          กรุณากรอกรหัสยืนยันตัวตนเพื่อเริ่มใช้งาน
        </p>
      </div>

      {/* Verification Form */}
      <div className="w-full max-w-md space-y-6 bg-card rounded-2xl p-6 shadow-xl border border-border">
        {/* Info Alert */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">ต้องการรหัสยืนยันตัวตน?</p>
            <p className="text-xs">ติดต่อทีมงานเพื่อขอรับรหัสยืนยันตัวตน</p>
          </div>
        </div>

        {/* Code Input */}
        <div>
          <label className="block text-sm font-medium mb-2">รหัสยืนยันตัวตน</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ใส่รหัสของคุณ"
            className="w-full px-4 py-3 bg-muted border-0 rounded-lg text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary uppercase"
            disabled={verifyMutation.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleVerify();
              }
            }}
          />
        </div>

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          disabled={verifyMutation.isPending || !code.trim()}
          className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {verifyMutation.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              กำลังตรวจสอบ...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 mr-2" />
              ยืนยันตัวตน
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
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>© 2025 ZenityX AI Studio</p>
      </div>
    </div>
  );
}

