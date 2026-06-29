import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export interface BrandSuggestion {
  name: string;
  tagline: string;
  suggestedDomain: string;
}

export type AvailabilityStatus = "available" | "taken" | "unknown";

export interface BrandAvailability {
  domain: { name: string; status: AvailabilityStatus };
  social: {
    instagram: AvailabilityStatus;
    twitter: AvailabilityStatus;
    linkedin: AvailabilityStatus;
  };
}

const rawApiBaseUrl =
  import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:3000";
const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "").endsWith("/api")
  ? rawApiBaseUrl.replace(/\/$/, "")
  : `${rawApiBaseUrl.replace(/\/$/, "")}/api`;

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function useGenerateBrands() {
  return useMutation({
    mutationFn: ({ data }: { data: Record<string, unknown> }) =>
      request<BrandSuggestion[]>(`/brands/generate`, data),
  });
}

export function useCheckBrandAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: Record<string, unknown> }) =>
      request<BrandAvailability>(`/brands/availability`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

export function useApiHealth() {
  return useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/healthz`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }, []);
}
