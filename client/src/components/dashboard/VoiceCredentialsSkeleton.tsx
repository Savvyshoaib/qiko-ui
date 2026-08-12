import { Skeleton } from "@/components/ui/skeleton";

type VoiceCredentialsSkeletonProps = {
  input?: number;
  button?: number;
};

export default function VoiceCredentialsSkeleton({
  input = 3,
  button = 1,
}: VoiceCredentialsSkeletonProps) {
  return (
    <div className="mb-2 space-y-4">
      {Array.from({ length: input }).map((_, idx) => (
        <div key={`input-${idx}`} className="space-y-2">
          <Skeleton className="h-4 w-32 bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
        </div>
      ))}
      {Array.from({ length: button }).map((_, idx) => (
        <Skeleton key={`button-${idx}`} className="h-10 w-full bg-white/10" />
      ))}
    </div>
  );
}
