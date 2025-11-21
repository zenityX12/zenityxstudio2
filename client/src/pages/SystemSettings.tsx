import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, Key, Plus, Trash2 } from "lucide-react";

export default function SystemSettings() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  
  // Form state
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("payment");
  const [formIsSecret, setFormIsSecret] = useState(1);

  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.systemSettings.getAll.useQuery();
  
  const setSettingMutation = trpc.systemSettings.set.useMutation({
    onSuccess: () => {
      toast.success("บันทึกการตั้งค่าสำเร็จ");
      utils.systemSettings.getAll.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const deleteSettingMutation = trpc.systemSettings.delete.useMutation({
    onSuccess: () => {
      toast.success("ลบการตั้งค่าสำเร็จ");
      utils.systemSettings.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormKey("");
    setFormValue("");
    setFormDescription("");
    setFormCategory("payment");
    setFormIsSecret(1);
  };

  const handleSubmit = () => {
    if (!formKey || !formValue) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setSettingMutation.mutate({
      key: formKey,
      value: formValue,
      description: formDescription,
      category: formCategory,
      isSecret: formIsSecret,
    });
  };

  const handleDelete = (key: string) => {
    if (confirm(`คุณต้องการลบการตั้งค่า "${key}" หรือไม่?`)) {
      deleteSettingMutation.mutate({ key });
    }
  };

  const toggleShowValue = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "payment": return "bg-green-100 text-green-800";
      case "email": return "bg-blue-100 text-blue-800";
      case "storage": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">ตั้งค่าระบบ</h1>
          <p className="text-muted-foreground mt-2">
            จัดการ API Keys และการตั้งค่าระบบต่างๆ
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มการตั้งค่า
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>เพิ่มการตั้งค่าใหม่</DialogTitle>
              <DialogDescription>
                เพิ่ม API Key หรือการตั้งค่าระบบใหม่
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="key">Key *</Label>
                <Input
                  id="key"
                  placeholder="เช่น omise_public_key"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="value">Value *</Label>
                <Textarea
                  id="value"
                  placeholder="ค่าของการตั้งค่า"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">คำอธิบาย</Label>
                <Input
                  id="description"
                  placeholder="คำอธิบายเพิ่มเติม"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">หมวดหมู่</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="isSecret">ประเภท</Label>
                <Select 
                  value={formIsSecret.toString()} 
                  onValueChange={(v) => setFormIsSecret(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Secret (ซ่อนค่า)</SelectItem>
                    <SelectItem value="0">Public (แสดงค่า)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={setSettingMutation.isPending}
              >
                {setSettingMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {!settings || settings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">ยังไม่มีการตั้งค่าในระบบ</p>
              <p className="text-sm text-muted-foreground mt-1">
                คลิกปุ่ม "เพิ่มการตั้งค่า" เพื่อเริ่มต้น
              </p>
            </CardContent>
          </Card>
        ) : (
          settings.map((setting) => (
            <Card key={setting.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg font-mono">
                        {setting.key}
                      </CardTitle>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getCategoryBadgeColor(
                          setting.category
                        )}`}
                      >
                        {setting.category}
                      </span>
                    </div>
                    {setting.description && (
                      <CardDescription>{setting.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(setting.key)}
                    disabled={deleteSettingMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-sm bg-muted p-3 rounded">
                    {setting.isSecret === 1 ? (
                      showValues[setting.id] ? (
                        setting.value
                      ) : (
                        "••••••••••••••••"
                      )
                    ) : (
                      setting.value
                    )}
                  </div>
                  {setting.isSecret === 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleShowValue(setting.id)}
                    >
                      {showValues[setting.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  อัปเดตล่าสุด: {new Date(setting.updatedAt).toLocaleString("th-TH")}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

