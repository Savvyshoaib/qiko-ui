"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchQueryFormProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchQueryForm({
  value,
  onChange,
  placeholder = "Search by name, email, or phone...",
}: SearchQueryFormProps) {
  return (
    <div className="relative mt-3">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 h-8 text-xs bg-white/[0.03] border-white/[0.08] placeholder:text-slate-600"
      />
    </div>
  );
}
