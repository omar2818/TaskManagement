import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/endpoints";
import type { CreateTaskRequest, TaskStatus } from "../api/types";
import { isAwaitingProcessing } from "../utils/format";

const POLL_INTERVAL_MS = 2000;

export const taskKeys = {
  all: ["tasks"] as const,
  list: ["tasks", "list"] as const,
  detail: (id: string) => ["tasks", "detail", id] as const,
};

/**
 * Background-processing visibility: while any task is still waiting for the API's background worker,
 * the list re-fetches every 2 s. Polling stops by itself once nothing is awaiting processing.
 */
export function useTasks() {
  return useQuery({
    queryKey: taskKeys.list,
    queryFn: () => tasksApi.list(),
    refetchInterval: (query) => (query.state.data?.some(isAwaitingProcessing) ? POLL_INTERVAL_MS : false),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.get(id),
    enabled: id.length > 0,
    refetchInterval: (query) => (query.state.data && isAwaitingProcessing(query.state.data) ? POLL_INTERVAL_MS : false),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateTaskRequest) => tasksApi.create(request),
    onSuccess: (created) => {
      queryClient.setQueryData(taskKeys.detail(created.id), created); // details page needs no extra request
      return queryClient.invalidateQueries({ queryKey: taskKeys.list }); // list re-fetched in API order
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => tasksApi.updateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(taskKeys.detail(updated.id), updated);
      return queryClient.invalidateQueries({ queryKey: taskKeys.list });
    },
  });
}
