/**
 * DigitalWorker type definition
 * Minimal type based on what's used in the frontend components
 */
export interface DigitalWorker {
  id: number;
  fullName?: string | null;
  professionalTitle?: string | null;
  headline?: string | null;
  location?: string | null;
  tone?: string | null;
  status?: "training" | "ready" | "error" | null;
  planType?: "premium" | "foundational" | null;
  monthlyPrice?: number | null;
  createdAt?: Date | string | null;
  currentStep?: number | null;
  categories?: string[] | null;
  // Add other properties as needed based on actual usage
  [key: string]: any;
}
