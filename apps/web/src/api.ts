let csrf = "";
const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const configured = Boolean(base);
export async function request<T = unknown>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  if (!base)
    throw new Error("Configura VITE_API_URL para conectar con tu API privada.");
  const response = await fetch(base + path, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message || "No fue posible completar la operación.",
    );
  if (result.data?.csrf) csrf = result.data.csrf;
  return result.data as T;
}
export type Row = Record<string, string | number | null>;
export const key = () => crypto.randomUUID();
