"use client";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationPromptProps {
  onRequest: () => void;
}

export function LocationPrompt({ onRequest }: LocationPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <MapPin className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Enable location</p>
        <p className="text-sm text-muted-foreground mt-1">
          See distance to restaurants and get nearby recommendations
        </p>
      </div>
      <Button onClick={onRequest} variant="secondary" size="sm">
        Allow location access
      </Button>
    </div>
  );
}
