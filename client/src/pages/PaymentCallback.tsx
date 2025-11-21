import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  
  const utils = trpc.useUtils();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[PaymentCallback] Payment callback received");
        
        // Show loading for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show success (webhook will handle adding credits)
        setStatus("success");
        setMessage("การชำระเงินสำเร็จ! เครดิตของคุณจะถูกเพิ่มในไม่กี่วินาที");
        
        // Clear sessionStorage
        sessionStorage.removeItem("pending_charge_id");
        sessionStorage.removeItem("pending_package_credits");
        
        // Invalidate credits query to refresh balance
        await utils.credits.get.invalidate();
        
        // Redirect to studio after 2 seconds
        setTimeout(() => setLocation("/studio"), 2000);
      } catch (error: any) {
        console.error("[PaymentCallback] Error:", error);
        setStatus("error");
        setMessage("เกิดข้อผิดพลาด กรุณาตรวจสอบยอดเครดิตของคุณในหน้า Studio");
        setTimeout(() => setLocation("/studio"), 3000);
      }
    };

    handleCallback();
  }, [setLocation, utils]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold">กำลังตรวจสอบการชำระเงิน...</h2>
            <p className="text-muted-foreground">
              กรุณารอสักครู่ อย่าปิดหน้าต่างนี้
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-green-600">สำเร็จ!</h2>
            <p className="text-lg">{message}</p>
            <p className="text-sm text-muted-foreground">
              กำลังนำคุณกลับไปยังหน้าหลัก...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-red-600">เกิดข้อผิดพลาด</h2>
            <p className="text-lg">{message}</p>
            <p className="text-sm text-muted-foreground">
              กำลังนำคุณกลับไปยังหน้าหลัก...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

