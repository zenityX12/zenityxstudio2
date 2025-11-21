import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { trpc } from "../lib/trpc";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface VerifyCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VerifyCodeModal({ open, onOpenChange }: VerifyCodeModalProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const utils = trpc.useUtils();
  const verifyMutation = trpc.verifiedCode.verify.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setMessage(data.message);
      // Refresh user data
      utils.auth.me.invalidate();
      // Close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setCode("");
        setStatus("idle");
        setMessage("");
      }, 2000);
    },
    onError: (error) => {
      setStatus("error");
      setMessage(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setStatus("error");
      setMessage("กรุณากรอกรหัสยืนยัน");
      return;
    }
    verifyMutation.mutate({ code: code.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>กรอก Verified Code</DialogTitle>
          <DialogDescription>
            สิทธิพิเศษสำหรับนักเรียนเซนนิตี้เอ็กซ์
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verified Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="กรอกรหัสยืนยันของคุณ"
              disabled={verifyMutation.isPending || status === "success"}
            />
          </div>

          {status !== "idle" && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                status === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              {status === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="text-sm">{message}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={verifyMutation.isPending || status === "success"}
              className="w-full"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังตรวจสอบ...
                </>
              ) : (
                "ยืนยัน"
              )}
            </Button>

            <a
              href="https://m.me/zenityXAiStudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ติดต่อขอ Verified Code / สมัครเรียนได้ที่นี่
            </a>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

