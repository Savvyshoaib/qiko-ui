// Example hooks for using React Query with REST API
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";

// Example: Fetch a list of items
export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: () => api.get<{ items: any[] }>("/items"),
  });
}

// Example: Fetch a single item by ID
export function useItem(id: string) {
  return useQuery({
    queryKey: ["items", id],
    queryFn: () => api.get<{ item: any }>(`/items/${id}`),
    enabled: !!id, // Only run query if id exists
  });
}

// Example: Create a new item
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => api.post("/items", data),
    onSuccess: () => {
      // Invalidate and refetch items list
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Example: Update an item
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/items/${id}`, data),
    onSuccess: (_, variables) => {
      // Invalidate specific item and items list
      queryClient.invalidateQueries({ queryKey: ["items", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Example: Delete an item
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.del(`/items/${id}`),
    onSuccess: () => {
      // Invalidate items list
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
