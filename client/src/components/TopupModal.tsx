import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, MessageCircle, Facebook } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TopupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Package {
  id: string;
  price: number;
  credits: number;
  discount?: number;
  popular?: boolean;
}

const packages: Package[] = [
  {
    id: "package_350",
    price: 350,
    credits: 350,
  },
  {
    id: "package_500",
    price: 500,
    credits: 500,
    popular: true,
  },
  {
    id: "package_1000",
    price: 1000,
    credits: 1000,
  },
];

export function TopupModal({ open, onOpenChange }: TopupModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const handleContactPage = () => {
    // Open Facebook Messenger
    window.open("https://m.me/zenityXAiStudio", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">เติมเครดิต</DialogTitle>
          <DialogDescription>
            เลือกแพ็คเกจที่ต้องการและติดต่อทีมงานเพื่อชำระเงิน
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Maintenance Alert */}
          <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-200">
              ระบบชำระเงินอัตโนมัติกำลังปรับปรุง
            </AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              ขออภัยในความไม่สะดวก กรุณาติดต่อทีมงานผ่าน Facebook Messenger เพื่อซื้อเครดิตโดยตรง
            </AlertDescription>
          </Alert>

          {/* Package Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">เลือกแพ็คเกจ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`relative p-6 rounded-lg border-2 transition-all ${
                    selectedPackage?.id === pkg.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-primary/50"
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                      แนะนำ
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">{pkg.credits}</div>
                    <div className="text-sm text-muted-foreground mb-1">เครดิต</div>
                    <div className="text-xl font-semibold text-primary">
                      ฿{pkg.price}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Package Summary */}
          {selectedPackage && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">แพ็คเกจที่เลือก:</span>
                <span className="font-semibold">{selectedPackage.credits} เครดิต</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ยอดชำระ:</span>
                <span className="text-xl font-bold text-primary">
                  ฿{selectedPackage.price}
                </span>
              </div>
            </div>
          )}

          {/* Contact Button */}
          <div className="space-y-3">
            <Button
              onClick={handleContactPage}
              disabled={!selectedPackage}
              className="w-full h-12 text-base"
              size="lg"
            >
              <Facebook className="w-5 h-5 mr-2" />
              ติดต่อทีมงานผ่าน Facebook
            </Button>
            
            {!selectedPackage && (
              <p className="text-sm text-center text-muted-foreground">
                กรุณาเลือกแพ็คเกจก่อนติดต่อทีมงาน
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
              วิธีการซื้อเครดิต:
            </h4>
            <ol className="text-sm space-y-1 text-blue-800 dark:text-blue-200 list-decimal list-inside">
              <li>เลือกแพ็คเกจที่ต้องการ</li>
              <li>คลิกปุ่ม "ติดต่อทีมงานผ่าน Facebook"</li>
              <li>แจ้งแพ็คเกจที่ต้องการกับทีมงาน</li>
              <li>ชำระเงินตามที่ทีมงานแจ้ง</li>
              <li>รอทีมงานเติมเครดิตให้ (ภายใน 5-10 นาที)</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

