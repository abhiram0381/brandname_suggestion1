import { useState, useEffect, useRef, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGenerateBrands, useCheckBrandAvailability, type AvailabilityStatus } from "@workspace/api-client-react";
import { Sparkles, Globe, Loader2, RefreshCw, Check, X, Linkedin, ChevronDown, ArrowUp, HelpCircle } from "lucide-react";
import { SiInstagram, SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type BrandSuggestion = {
  name: string;
  tagline: string;
  suggestedDomain: string;
};

const formSchema = z.object({
  description: z.string().min(1, "Please describe what you're building").max(500, "Too long"),
  category: z.string().min(2, "Please select or enter a category"),
  keywords: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

// The Radix Select uses react-remove-scroll, which can leave the page scroll-locked
// (body[data-scroll-locked] → overflow:hidden, plus pointer-events:none) after it
// closes — that prevents the user from scrolling back up. Clear any leftover lock.
function releaseScrollLock() {
  document.body.removeAttribute("data-scroll-locked");
  if (document.body.style.pointerEvents === "none") {
    document.body.style.pointerEvents = "";
  }
}

// Smoothness is handled by `scroll-behavior: smooth` on <html> (see index.css).
// This plain call animates in browsers that support it and falls back to an
// instant jump where it doesn't — either way it reliably reaches the target.
function smoothScrollTo(targetY: number) {
  window.scrollTo(0, targetY);
}

// Absolute document offset of an element's top.
function offsetTop(el: HTMLElement | null): number {
  return el ? el.getBoundingClientRect().top + window.scrollY : 0;
}

export default function Home() {
  const [brands, setBrands] = useState<BrandSuggestion[]>([]);
  const generateBrandsMutation = useGenerateBrands();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [scrollNonce, setScrollNonce] = useState(0);
  const [generateNonce, setGenerateNonce] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const resultsRef = useRef<HTMLElement | null>(null);
  const detailsRef = useRef<HTMLElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      category: "",
      keywords: ""
    }
  });

  function onSubmit(values: FormValues) {
    setSelectedIndex(null);
    generateBrandsMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setBrands(data);
          setGenerateNonce((n) => n + 1);
        }
      }
    );
  }

  function handleSelectChip(index: number) {
    setSelectedIndex(index);
    setScrollNonce((n) => n + 1);
  }

  // Scroll up to the previous section (details → chips → hero), one step per click.
  function scrollUpOneSection() {
    const tops = [0]; // hero / form section
    if (resultsRef.current) tops.push(offsetTop(resultsRef.current));
    if (detailsRef.current) tops.push(offsetTop(detailsRef.current));
    tops.sort((a, b) => a - b);

    const y = window.scrollY;
    // Nearest section top strictly above the current position.
    const target = tops.filter((t) => t < y - 2).pop() ?? 0;
    smoothScrollTo(target);
    setShowBackToTop(target > 0);
  }  
  // Show the "back to top" button once the user scrolls past the hero.
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // After generating, scroll the brands section to fill the viewport.
  useEffect(() => {
    if (generateNonce > 0) {
      releaseScrollLock();
      smoothScrollTo(offsetTop(resultsRef.current));
      setShowBackToTop(true);
    }
  }, [generateNonce]);

  // After picking a chip, scroll the details section to fill the viewport.
  useEffect(() => {
    if (selectedIndex !== null) {
      releaseScrollLock();
      smoothScrollTo(offsetTop(detailsRef.current));
      setShowBackToTop(true);
    }
  }, [scrollNonce, selectedIndex]);

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[50%] rounded-full bg-chart-4/5 blur-[100px] pointer-events-none" />
      
      <main className="relative z-10 w-full">
        {/* SECTION 1 — input form (full screen) */}
        <section className="min-h-[100dvh] w-full flex flex-col items-center justify-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="w-full max-w-2xl text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-none py-1.5 px-4 text-sm rounded-full font-medium">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered Discovery
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
            Name your next <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-4">big idea.</span>
          </h1>
        </div>

        <div className="w-full max-w-2xl bg-card rounded-2xl shadow-xl shadow-primary/5 border border-border p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">What are you building?</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A marketplace for vintage film cameras and lenses..." 
                        className="resize-none min-h-[120px] text-base"
                        data-testid="input-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Industry / Category</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <select
                            {...field}
                            data-testid="select-category"
                            className={`w-full h-12 appearance-none rounded-md border border-input bg-background pl-3 pr-10 text-base shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 ${field.value ? 'text-foreground' : 'text-muted-foreground'}`}
                          >
                            <option value="" disabled>Select industry</option>
                            <option value="technology">Technology & SaaS</option>
                            <option value="ecommerce">E-Commerce & Retail</option>
                            <option value="health">Health & Wellness</option>
                            <option value="finance">Finance & Fintech</option>
                            <option value="food">Food & Beverage</option>
                            <option value="creative">Creative & Agency</option>
                            <option value="education">Education & Edtech</option>
                            <option value="other">Other</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Style hints <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. minimalist, playful, futuristic" 
                          className="text-base h-12"
                          data-testid="input-keywords"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full text-lg h-14 font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={generateBrandsMutation.isPending}
                  data-testid="button-submit-generate"
                >
                  {generateBrandsMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Conjuring names...
                    </>
                  ) : (
                    <>
                      Generate Brands
                      <Sparkles className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                {generateBrandsMutation.isError && (
                  <p className="text-sm text-destructive text-center mt-3 font-medium bg-destructive/10 py-2 rounded-lg" data-testid="error-message">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>
            </form>
          </Form>
        </div>

        </section>

        {/* SECTION 2 — generated brand chips (full screen) */}
        {brands.length > 0 && (
          <section
            ref={resultsRef}
            id="results"
            className="min-h-[100dvh] w-full flex flex-col justify-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
          >
            <div className="w-full max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-3xl font-bold tracking-tight">Generated Brands</h2>
              <Button
                variant="outline"
                onClick={() => form.handleSubmit(onSubmit)()}
                disabled={generateBrandsMutation.isPending}
                className="hidden md:flex"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generateBrandsMutation.isPending ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
            <p className="text-muted-foreground mb-8">
              Tap a name to check domain &amp; social availability.
            </p>

            {/* Chips container — 3 equal columns of clickable brand chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="brand-chips">
              {brands.map((brand, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectChip(index)}
                  aria-pressed={selectedIndex === index}
                  data-testid={`brand-chip-${index}`}
                  title={brand.name}
                  className={`w-full px-5 py-2.5 rounded-full text-base font-semibold border text-center truncate transition-colors duration-200 ${
                    selectedIndex === index
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25'
                      : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  {brand.name}
                </button>
              ))}
            </div>

            </div>
          </section>
        )}

        {/* SECTION 3 — selected brand details (full screen) */}
        {brands.length > 0 && selectedIndex !== null && (
          <section
            ref={detailsRef}
            className="min-h-[100dvh] w-full flex flex-col justify-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
          >
            <div className="w-full max-w-2xl mx-auto">
              <BrandDetails key={brands[selectedIndex].name} brand={brands[selectedIndex]} />
            </div>
          </section>
        )}
      </main>

      {/* Scroll up one section at a time (details → chips → hero) */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollUpOneSection}
          aria-label="Scroll up one section"
          data-testid="back-to-top"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function BrandDetails({ brand }: { brand: BrandSuggestion }) {
  const checkAvailability = useCheckBrandAvailability();

  useEffect(() => {
    checkAvailability.mutate({
      data: {
        name: brand.name,
        domain: brand.suggestedDomain
      }
    });
    // Remounted per brand (keyed by name), so fetch once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = checkAvailability.data;
  const handle = brand.name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Always show X, Instagram and LinkedIn, each with its availability status.
  const socials = data
    ? [
        { platform: "X", status: data.social.twitter, icon: <SiX className="w-5 h-5" /> },
        { platform: "Instagram", status: data.social.instagram, icon: <SiInstagram className="w-5 h-5" /> },
        { platform: "LinkedIn", status: data.social.linkedin, icon: <Linkedin className="w-5 h-5" /> }
      ]
    : [];
  const domainStatus: AvailabilityStatus = data?.domain.status ?? "unknown";
  const hasUnverified = socials.some((s) => s.status === "unknown");

  return (
    <div
      className="border border-primary rounded-2xl bg-card shadow-md ring-1 ring-primary/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
      data-testid="brand-details"
    >
      {/* Header */}
      <div className="p-6 md:p-8 border-b bg-gradient-to-r from-primary/5 to-chart-4/5">
        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
          <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight" data-testid="text-brand-name">
            {brand.name}
          </h3>
          <p className="text-base text-muted-foreground font-medium" data-testid="text-brand-tagline">
            {brand.tagline}
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-muted/30">
        {checkAvailability.isPending ? (
          <AvailabilitySkeleton />
        ) : checkAvailability.isError ? (
          <div className="text-center py-8 text-destructive flex flex-col items-center">
            <X className="w-8 h-8 mb-2 opacity-50" />
            <p>Failed to check availability. Please try again.</p>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Domain Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Domain
              </h4>
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl border bg-background shadow-sm">
                <span className="text-lg font-semibold truncate">{data.domain.name}</span>
                <StatusBadge status={domainStatus} />
              </div>
            </div>

            {/* Social Section — X, Instagram and LinkedIn, all shown with status */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Social Handles
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {socials.map((s) => (
                  <SocialRow
                    key={s.platform}
                    platform={s.platform}
                    handle={handle}
                    status={s.status}
                    icon={s.icon}
                  />
                ))}
              </div>
              {hasUnverified && (
                <p className="text-xs text-muted-foreground">
                  — couldn&apos;t be auto-verified (the platform blocks automated checks); check it manually.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AvailabilityStatus }) {
  if (status === "available") {
    return (
      <Badge variant="outline" className="shrink-0 whitespace-nowrap bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 gap-1.5">
        <Check className="w-3.5 h-3.5" />
        Available
      </Badge>
    );
  }
  if (status === "taken") {
    return (
      <Badge variant="outline" className="shrink-0 whitespace-nowrap bg-rose-500/10 text-rose-600 border-rose-500/20 px-3 py-1 gap-1.5">
        <X className="w-3.5 h-3.5" />
        Taken
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 whitespace-nowrap bg-muted text-muted-foreground border-border px-3 py-1 gap-1.5">
      <HelpCircle className="w-3.5 h-3.5" />
      Unverified
    </Badge>
  );
}

function SocialRow({
  platform,
  handle,
  status,
  icon
}: {
  platform: string;
  handle: string;
  status: AvailabilityStatus;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-xl border bg-background shadow-sm">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`shrink-0 text-muted-foreground ${status === 'available' ? 'text-primary' : ''}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{platform}</p>
          <p className="text-sm font-semibold truncate">{handle}</p>
        </div>
      </div>
      <div className="flex items-center justify-center w-6 h-6 shrink-0">
        {status === "available" ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : status === "taken" ? (
          <X className="w-4 h-4 text-rose-500" />
        ) : (
          <HelpCircle className="w-4 h-4 text-muted-foreground" aria-label="Couldn't verify" />
        )}
      </div>
    </div>
  );
}

function AvailabilitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3 text-muted-foreground py-4 animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="font-medium">Checking live availability...</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-60">
        <div className="space-y-4">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <div className="grid grid-cols-1 gap-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
