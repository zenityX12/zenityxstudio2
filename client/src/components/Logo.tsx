import { Link } from "wouter";

interface LogoProps {
  className?: string;
}

// Logo with Link (for standalone use)
export function Logo({ className = "" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center hover:opacity-80 transition-opacity ${className}`}>
      <img 
        src="/logos/light.png" 
        alt="ZenityX" 
        className="h-10 dark:hidden" 
      />
      <img 
        src="/logos/dark.png" 
        alt="ZenityX" 
        className="h-10 hidden dark:block" 
      />
    </Link>
  );
}

// LogoImage without Link (for use inside other Links)
export function LogoImage({ className = "" }: LogoProps) {
  return (
    <>
      <img 
        src="/logos/light.png" 
        alt="ZenityX" 
        className={`h-10 dark:hidden ${className}`}
      />
      <img 
        src="/logos/dark.png" 
        alt="ZenityX" 
        className={`h-10 hidden dark:block ${className}`}
      />
    </>
  );
}

