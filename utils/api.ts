import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY } from "@/lib/auth";

export const BACKEND_URL =
  Constants.expoConfig?.extra?.backendUrl ||
  "https://6e5aupc952n3mf8tjvk5nswn3wcw25te.app.specular.dev";

export const isBackendConfigured = (): boolean => {
  return !!BACKEND_URL && BACKEND_URL.length > 0;
};

export const getBearerToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(BEARER_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    }
  } catch (error) {
    console.error("[API] Error retrieving bearer token:", error);
    return null;
  }
};

export const apiCall = async <T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  if (!isBackendConfigured()) {
    throw new Error("Backend URL not configured. Please rebuild the app.");
  }

  const url = `${BACKEND_URL}${endpoint}`;
  console.log(`[API] ${options?.method ?? "GET"} ${url}`);

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  };

  const token = await getBearerToken();
  if (token) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    console.error(`[API] Error ${response.status} for ${url}:`, text.slice(0, 200));
    throw new Error(`API error ${response.status}: ${text.slice(0, 100)}`);
  }

  const data = await response.json();
  console.log(`[API] Response from ${endpoint}:`, JSON.stringify(data).slice(0, 200));
  return data as T;
};

export const apiGet = async <T = unknown>(endpoint: string): Promise<T> => {
  return apiCall<T>(endpoint, { method: "GET" });
};

export const apiPost = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const apiPut = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const apiPatch = async <T = unknown>(endpoint: string, data: unknown): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const apiDelete = async <T = unknown>(endpoint: string): Promise<T> => {
  return apiCall<T>(endpoint, { method: "DELETE" });
};

// ─── Domain types ────────────────────────────────────────────────────────────

export interface AptosScoreResponse {
  score: number;
  label: 'Beginner' | 'Building' | 'Consistent' | 'Advanced' | 'Elite' | 'Legend';
  breakdown: {
    calorie_score: number;
    calorie_adherence_pct: number;
    calorie_ambition_multiplier: number;
    fitness_score: number;
    fitness_adherence_pct: number;
    fitness_ambition_multiplier: number;
    consistency_score: number;
    consistency_pct: number;
    days_analyzed: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  weight_lbs: number;
  height_inches: number;
  activity_level:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extra_active";
  goal_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
  goal_lifting_volume_lbs: number;
  goal_cardio_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInput {
  name: string;
  age: number;
  weight_lbs: number;
  height_inches: number;
  activity_level:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | "extra_active";
  goal_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
  goal_lifting_volume_lbs: number;
  goal_cardio_minutes: number;
}

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface FoodLogInput {
  user_id: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  date: string;
  exercise_name: string;
  exercise_type: "strength" | "cardio" | "hiit" | "flexibility" | "other";
  sets?: number;
  reps?: number;
  weight_lbs?: number;
  duration_minutes?: number;
  distance_miles?: number;
  calories_burned?: number;
  notes?: string;
  created_at: string;
}

export interface ExerciseLogInput {
  user_id: string;
  date: string;
  exercise_name: string;
  exercise_type: "strength" | "cardio" | "hiit" | "flexibility" | "other";
  sets?: number;
  reps?: number;
  weight_lbs?: number;
  duration_minutes?: number;
  distance_miles?: number;
  calories_burned?: number;
  notes?: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_lbs: number;
  created_at: string;
}

export interface WeightLogInput {
  user_id: string;
  date: string;
  weight_lbs: number;
}

export interface ProgressData {
  weight_trend: { date: string; weight_lbs: number }[];
  calorie_trend: {
    date: string;
    calories_consumed: number;
    calories_burned: number;
  }[];
  activity_trend: {
    date: string;
    exercise_count: number;
    total_calories_burned: number;
  }[];
  weekly_lifting_volume: number;
  weekly_cardio_minutes: number;
}

// ─── Community types ──────────────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  friendship_status?: "none" | "pending_sent" | "pending_received" | "friends";
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  requester?: UserSummary;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  post_type: "workout" | "meal";
  title: string;
  description?: string;
  data: string;
  likes_count: number;
  liked_by_me?: boolean;
  author?: UserSummary;
  created_at: string;
}

// ─── Domain API functions ─────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    return await apiGet<UserProfile>(`/api/profile/${userId}`);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("404")) return null;
    throw e;
  }
}

export async function upsertProfile(
  userId: string,
  data: UserProfileInput
): Promise<UserProfile> {
  return apiPut<UserProfile>(`/api/profile/${userId}`, data);
}

export async function listFoodLogs(
  userId: string,
  date: string
): Promise<{ logs: FoodLog[]; totals: MacroTotals }> {
  return apiGet<{ logs: FoodLog[]; totals: MacroTotals }>(
    `/api/food-logs?user_id=${userId}&date=${date}`
  );
}

export async function createFoodLog(data: FoodLogInput): Promise<FoodLog> {
  return apiPost<FoodLog>("/api/food-logs", data);
}

export async function deleteFoodLog(id: string): Promise<void> {
  await apiDelete<void>(`/api/food-logs/${id}`);
}

export async function listExerciseLogs(
  userId: string,
  date: string
): Promise<{ logs: ExerciseLog[]; total_calories_burned: number }> {
  return apiGet<{ logs: ExerciseLog[]; total_calories_burned: number }>(
    `/api/exercise-logs?user_id=${userId}&date=${date}`
  );
}

export async function createExerciseLog(
  data: ExerciseLogInput
): Promise<ExerciseLog> {
  return apiPost<ExerciseLog>("/api/exercise-logs", data);
}

export async function deleteExerciseLog(id: string): Promise<void> {
  await apiDelete<void>(`/api/exercise-logs/${id}`);
}

export async function listWeightLogs(
  userId: string,
  days = 30
): Promise<{ logs: WeightLog[] }> {
  return apiGet<{ logs: WeightLog[] }>(
    `/api/weight-logs?user_id=${userId}&days=${days}`
  );
}

export async function createWeightLog(data: WeightLogInput): Promise<WeightLog> {
  return apiPost<WeightLog>("/api/weight-logs", data);
}

export async function deleteWeightLog(id: string): Promise<void> {
  await apiDelete<void>(`/api/weight-logs/${id}`);
}

export async function getProgress(
  userId: string,
  days = 30
): Promise<ProgressData> {
  return apiGet<ProgressData>(`/api/progress/${userId}?days=${days}`);
}

// ─── Community API functions ──────────────────────────────────────────────────

export async function searchUsers(
  q: string
): Promise<{ users: UserSummary[] }> {
  return apiGet<{ users: UserSummary[] }>(
    `/api/users/search?q=${encodeURIComponent(q)}`
  );
}

export async function listFriends(): Promise<{ friends: UserSummary[] }> {
  return apiGet<{ friends: UserSummary[] }>("/api/friends");
}

export async function listFriendRequests(): Promise<{
  requests: FriendRequest[];
}> {
  return apiGet<{ requests: FriendRequest[] }>("/api/friend-requests");
}

export async function sendFriendRequest(
  recipientId: string
): Promise<FriendRequest> {
  return apiPost<FriendRequest>("/api/friend-requests", {
    recipient_id: recipientId,
  });
}

export async function respondFriendRequest(
  id: string,
  status: "accepted" | "declined"
): Promise<FriendRequest> {
  return apiPut<FriendRequest>(`/api/friend-requests/${id}`, { status });
}

export async function getCommunityFeed(): Promise<{ posts: Post[] }> {
  return apiGet<{ posts: Post[] }>("/api/community/feed");
}

export async function createPost(data: {
  post_type: "workout" | "meal";
  title: string;
  description?: string;
  data: string;
}): Promise<Post> {
  return apiPost<Post>("/api/community/posts", data);
}

export async function toggleLike(
  postId: string
): Promise<{ liked: boolean; likes_count: number }> {
  return apiPost<{ liked: boolean; likes_count: number }>(
    `/api/community/posts/${postId}/like`,
    {}
  );
}

export const getAptosScore = async (userId: string): Promise<AptosScoreResponse> => {
  return apiGet<AptosScoreResponse>(`/api/aptos-score?user_id=${userId}`);
};
