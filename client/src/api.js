const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const err = new Error(body?.error || `خطأ في الطلب (${res.status})`);
    err.status = res.status;
    err.payload = body;
    throw err;
  }
  return body;
}

export const api = {
  getPeople: () => request("/people"),
  getPerson: (id) => request(`/people/${id}`),
  createPerson: (data) => request("/people", { method: "POST", body: JSON.stringify(data) }),
  updatePerson: (id, data) => request(`/people/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePerson: (id, cascade) =>
    request(`/people/${id}${cascade ? "?mode=cascade" : ""}`, { method: "DELETE" }),
  login: (password) => request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  authStatus: () => request("/auth/status"),
};
