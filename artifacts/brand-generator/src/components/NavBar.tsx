import { Sparkles, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-bold tracking-tight text-lg">
            BrandGen
          </span>
        </div>
        
        <div className="flex items-center">
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-primary/20 text-primary hover:bg-primary/10">
            <Headphones className="h-4 w-4" />
            <span className="font-semibold">Support</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
