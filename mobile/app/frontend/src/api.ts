import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const jsonHeaders = {
  "Content-Type": "application/json",
};

async function authHeaders() {
  const token = await AsyncStorage.getItem("auth_token");

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = Object.fromEntries(
    Object.entries({
      ...jsonHeaders,
      ...(await authHeaders()),
      ...(options.headers ?? {}),
    }).filter(([_, value]) => value !== undefined)
  );

  const response = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = await response.json();
      message = body.detail ?? message;
    } catch {
      // Ignore invalid JSON responses.
    }

    throw new Error(message);
  }

  return response.json();
}

function post<T = unknown>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const Exams = {
  list: () =>
    api<{ exams: any[]; goals: any[] }>("/exams"),

  topics: (examId: string) =>
    api<{ exam_id: string; subjects: any[] }>(
      `/exams/${examId}/topics`
    ),

  plan: (examId: string, goal: string, days: number) =>
    api(
      `/exams/${examId}/plan?goal=${goal}&timeline_days=${days}`
    ),
};

export const Digest = {
  list: (examId?: string) =>
    api<{ items: any[] }>(
      `/digest${examId ? `?exam_id=${examId}` : ""}`
    ),
};

export const UpscApi = {
  tracks: () =>
    api<{ tracks: any[] }>("/upsc/tracks"),
};

export const Auth = {
  signup: (
    email: string,
    password: string,
    fullName: string
  ) =>
    post("/auth/signup", {
      email,
      password,
      full_name: fullName,
    }),

  login: (email: string, password: string) =>
    post("/auth/login", {
      email,
      password,
    }),

  me: () => api("/auth/me"),
};

export const Progress = {
  get: () =>
    api<{ progress: any }>("/progress"),

  save: (progress: any) =>
    post("/progress", progress),
};