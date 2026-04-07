import type { AdminDashboardDto } from "../types/apiDtos";
import { apiRequest } from "./client";

const BASE = "/api/admin/dashboard";

export function fetchAdminDashboard(signal?: AbortSignal) {
  return apiRequest<AdminDashboardDto>(BASE, { method: "GET", signal });
}
