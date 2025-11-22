import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import { ArrowRight, Sparkles, Video, Image as ImageIcon, Facebook, Mail, Phone, MapPin, MessageCircle, Sun, Moon } from "lucide-react";
import { Link, Redirect } from "wouter";
import { useIsMobile } from "@/hooks/useMediaQuery";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();

  // Redirect authenticated mobile users to Gallery
  if (isMobile && isAuthenticated) {
    return <Redirect to="/gallery" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <img src="/logos/light.png" alt="ZenityX" className="h-12 dark:hidden" />
            <img src="/logos/dark.png" alt="ZenityX" className="h-12 hidden dark:block" />
          </div>
          
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const html = document.documentElement;
                if (html.classList.contains('dark')) {
                  html.classList.remove('dark');
                  localStorage.setItem('theme', 'light');
                } else {
                  html.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                }
              }}
            >
              <Sun className="h-5 w-5 dark:hidden" />
              <Moon className="h-5 w-5 hidden dark:block" />
            </Button>
            
            {isAuthenticated ? (
              <>
                <Button asChild variant="outline" size="lg">
                  <Link href="/studio">Studio</Link>
                </Button>
                {(user?.role === "admin" || user?.role === "sale") && (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
              </>
            ) : (
              <Button asChild size="lg">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container py-24 md:py-32 lg:py-40">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            <div className="space-y-6">
              <div className="inline-block">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-gray-700 text-foreground dark:text-gray-400 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  สถาบันอันดับ 1 เรียน AI
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                สร้างสรรค์ด้วย AI
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                เปลี่ยนไอเดียของคุณให้เป็นภาพและวิดีโอที่สวยงาม<br />
                ด้วยเทคโนโลยี AI ล้ำสมัยจาก <span className="font-semibold text-foreground">Zenity<span className="text-red-500">X</span></span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {isAuthenticated ? (
                <>
                  <Button asChild size="lg" className="text-lg h-14 px-8 !bg-black dark:!bg-white hover:!bg-gray-900 dark:hover:!bg-gray-100 !text-white dark:!text-black shadow-lg hover:shadow-xl transition-all w-full sm:w-auto sm:min-w-[180px]">
                    <Link href="/studio">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="text-lg h-14 px-8 w-full sm:w-auto sm:min-w-[180px]">
                    <Link href="/gallery">View Gallery</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="text-lg h-14 px-8 !bg-black dark:!bg-white hover:!bg-gray-900 dark:hover:!bg-gray-100 !text-white dark:!text-black shadow-lg hover:shadow-xl transition-all w-full sm:w-auto sm:min-w-[180px]">
                    <Link href="/login">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="text-lg h-14 px-8 w-full sm:w-auto sm:min-w-[180px]">
                    <Link href="/gallery">View Gallery</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container py-20 border-t">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">โมเดล AI ที่ทรงพลัง</h2>
              <p className="text-xl text-muted-foreground">เข้าถึงเทคโนโลยี AI ล่าสุดในที่เดียว</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* สร้างภาพ Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-card border p-8 hover:shadow-xl transition-all duration-300">
                <div className="relative space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 dark:bg-gray-700">
                    <ImageIcon className="h-7 w-7 text-foreground dark:text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold">สร้างภาพ</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    สร้างภาพคุณภาพสูงด้วย AI รุ่นล่าสุด
                  </p>
                  <div className="pt-2 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-gray-400"></div>
                      <span>Nano Banana</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-gray-400"></div>
                      <span>Seedream V4</span>
                    </div>
                  </div>
                  <div className="pt-4">
                    {isAuthenticated ? (
                      <Button asChild className="w-full">
                        <Link href="/studio">ลองใช้งาน</Link>
                      </Button>
                    ) : (
                      <Button asChild className="w-full">
                        <Link href="/login">ลองใช้งาน</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* สร้างวิดีโอ Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-card border p-8 hover:shadow-xl transition-all duration-300">
                <div className="relative space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 dark:bg-gray-700">
                    <Video className="h-7 w-7 text-foreground dark:text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold">สร้างวิดีโอ</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    สร้างวิดีโอระดับมืออาชีพจากข้อความ
                  </p>
                  <div className="pt-2 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-gray-400"></div>
                      <span>Sora 2 / Sora 2 Pro</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-gray-400"></div>
                      <span>Veo 3.1</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-gray-400"></div>
                      <span>Seedance</span>
                    </div>
                  </div>
                  <div className="pt-4">
                    {isAuthenticated ? (
                      <Button asChild className="w-full">
                        <Link href="/studio">ลองใช้งาน</Link>
                      </Button>
                    ) : (
                      <Button asChild className="w-full">
                        <Link href="/login">ลองใช้งาน</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Multiple Models Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-card border p-8 hover:shadow-xl transition-all duration-300">
                <div className="relative space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 dark:bg-gray-700">
                    <Sparkles className="h-7 w-7 text-foreground dark:text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold">คุณสมบัติพิเศษ</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    ฟีเจอร์ขั้นสูงสำหรับงานสร้างสรรค์
                  </p>
                  <div className="pt-2 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-gray-400"></div>
                      <span>Image-to-Video</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-gray-400"></div>
                      <span>Storyboard</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground dark:bg-gray-400"></div>
                      <span>Multiple Resolutions</span>
                    </div>
                  </div>
                  <div className="pt-4">
                    {isAuthenticated ? (
                      <Button asChild className="w-full">
                        <Link href="/studio">ลองใช้งาน</Link>
                      </Button>
                    ) : (
                      <Button asChild className="w-full">
                        <Link href="/login">ลองใช้งาน</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="container py-20 border-t">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">เกี่ยวกับ Zenity<span className="text-red-500">X</span></h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                ZenityX เป็นสถาบันชั้นนำด้านการศึกษา AI และเทคโนโลยีล้ำสมัย 
                เรามุ่งมั่นที่จะนำเสนอเครื่องมือและความรู้ที่ทันสมัยที่สุด
                เพื่อช่วยให้ทุกคนสามารถสร้างสรรค์ผลงานด้วย AI ได้อย่างมืออาชีพ
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {isAuthenticated ? (
                <Button asChild size="lg" className="text-lg h-14 px-8">
                  <Link href="/studio">เริ่มต้นใช้งาน</Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="text-lg h-14 px-8">
                  <Link href="/login">เริ่มต้นใช้งาน</Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="text-lg h-14 px-8">
                <Link href="/gallery">ดูผลงาน</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="container py-20 border-t">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">ติดต่อเรา</h2>
              <p className="text-xl text-muted-foreground">พร้อมให้คำปรึกษาและตอบคำถามทุกเรื่อง</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 rounded-xl bg-card border min-h-[200px]">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-foreground dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">ที่อยู่</h3>
                    <a 
                      href="https://maps.app.goo.gl/fJxkhQh65Bu66xKXA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      บริษัท เซ็นนิตี้เอ็กซ์ จำกัด<br />
                      171 2 ถ. โชคชัย 4<br />
                      แขวงสะพานสอง เขตวังทองหลาง<br />
                      กรุงเทพมหานคร 10310
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 rounded-xl bg-card border">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-foreground dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">อีเมล</h3>
                    <a href="mailto:admin@zenityxai.com" className="text-muted-foreground hover:text-primary transition-colors">
                      admin@zenityxai.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 rounded-xl bg-card border min-h-[200px]">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-foreground dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Phone</h3>
                    <a href="tel:+6662262964" className="text-muted-foreground hover:text-primary transition-colors">
                      +66 062-262-9644
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 rounded-xl bg-card border">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-6 w-6 text-foreground dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">แชทเพื่อส่งข้อความ</h3>
                    <a 
                      href="https://m.me/zenityXAiStudio" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      ข้อความ Messenger Facebook
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center">
              <Button 
                asChild 
                size="lg" 
                className="gap-2 h-16 px-10 text-lg bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
              >
                <a href="https://www.facebook.com/zenityXAiStudio/" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-6 w-6" />
                  ติดตามเราบน Facebook
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-card/50">
        <div className="container">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <img src="/logos/light.png" alt="ZenityX" className="h-10 dark:hidden" />
              <img src="/logos/dark.png" alt="ZenityX" className="h-10 hidden dark:block" />
              <p className="text-sm text-muted-foreground">
                สถาบันชั้นนำด้านการศึกษา AI และเทคโนโลยีล้ำสมัย
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">เมนู</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/studio" className="hover:text-primary transition-colors">Studio</Link></li>
                <li><Link href="/gallery" className="hover:text-primary transition-colors">Gallery</Link></li>
                <li><Link href="/history" className="hover:text-primary transition-colors">History</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">ติดต่อ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:admin@zenityxai.com" className="hover:text-primary transition-colors">
                    admin@zenityxai.com
                  </a>
                </li>
                <li>
                  <a href="tel:+6662262964" className="hover:text-primary transition-colors">
                    +66 062-262-9644
                  </a>
                </li>
                <li>
                  <a href="https://www.facebook.com/zenityXAiStudio/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    Facebook
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Zenity<span className="text-red-500">X</span>. สงวนลิขสิทธิ์</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

