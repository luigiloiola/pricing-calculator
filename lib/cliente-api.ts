"use client";

/** fetch para as rotas internas: se a sessão caiu, volta para o login. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* sem corpo */
  }
  if (res.status === 401) {
    const volta = window.location.pathname + window.location.search;
    window.location.href = `/login?next=${encodeURIComponent(volta)}`;
    throw new Error("Sessão expirada.");
  }
  if (!res.ok) throw new Error((body as { erro?: string } | null)?.erro ?? `HTTP ${res.status}`);
  return body as T;
}
