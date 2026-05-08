import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  const testUserId = "test-user-001";
  const testDate = "2026-04-29";

  let foodLogId: string;
  let exerciseLogId: string;
  let weightLogId: string;
  let friendRequestId: string;
  let communityPostId: string;
  let authToken: string;
  let secondUserToken: string;
  let secondUserId: string;

  describe("Profile endpoints", () => {
    test("PUT - Create/upsert profile", async () => {
      const res = await api(`/api/profile/${testUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          age: 25,
          weight_lbs: 180,
          height_inches: 70,
          activity_level: "moderately_active",
          goal_calories: 2500,
          goal_protein_g: 150,
          goal_carbs_g: 250,
          goal_fat_g: 80,
          goal_lifting_volume_lbs: 5000,
          goal_cardio_minutes: 150,
        }),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe("Test User");
    });

    test("GET - Retrieve profile", async () => {
      const res = await api(`/api/profile/${testUserId}`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.name).toBe("Test User");
      expect(data.age).toBe(25);
    });

    test("GET - Non-existent profile returns 404", async () => {
      const res = await api(`/api/profile/nonexistent-id-12345`);
      await expectStatus(res, 404);
    });

    test("PUT - Missing required field returns 400", async () => {
      const res = await api(`/api/profile/${testUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Incomplete" }),
      });
      await expectStatus(res, 400);
    });

    test("PUT - Invalid activity_level returns 400", async () => {
      const res = await api(`/api/profile/${testUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          age: 25,
          weight_lbs: 180,
          height_inches: 70,
          activity_level: "invalid_level",
          goal_calories: 2500,
          goal_protein_g: 150,
          goal_carbs_g: 250,
          goal_fat_g: 80,
          goal_lifting_volume_lbs: 5000,
          goal_cardio_minutes: 150,
        }),
      });
      await expectStatus(res, 400);
    });
  });

  describe("Food logs endpoints", () => {
    test("POST - Create food log", async () => {
      const res = await api("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          meal_type: "breakfast",
          food_name: "Eggs and toast",
          calories: 350,
          protein_g: 20,
          carbs_g: 30,
          fat_g: 15,
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      foodLogId = data.id;
      expect(data.id).toBeDefined();
      expect(data.food_name).toBe("Eggs and toast");
    });

    test("GET - Retrieve food logs for date", async () => {
      const res = await api(`/api/food-logs?user_id=${testUserId}&date=${testDate}`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.totals).toBeDefined();
      expect(typeof data.totals.calories).toBe("number");
    });

    test("POST - Create another food log with different meal type", async () => {
      const res = await api("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          meal_type: "lunch",
          food_name: "Chicken salad",
          calories: 450,
          protein_g: 40,
          carbs_g: 20,
          fat_g: 18,
        }),
      });
      await expectStatus(res, 201);
    });

    test("POST - Missing required field returns 400", async () => {
      const res = await api("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          meal_type: "snack",
        }),
      });
      await expectStatus(res, 400);
    });

    test("POST - Invalid meal_type returns 400", async () => {
      const res = await api("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          meal_type: "invalid_meal",
          food_name: "Test food",
          calories: 100,
          protein_g: 10,
          carbs_g: 10,
          fat_g: 5,
        }),
      });
      await expectStatus(res, 400);
    });

    test("DELETE - Remove food log", async () => {
      const res = await api(`/api/food-logs/${foodLogId}`, { method: "DELETE" });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Exercise logs endpoints", () => {
    test("POST - Create exercise log (strength)", async () => {
      const res = await api("/api/exercise-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          exercise_name: "Bench press",
          exercise_type: "strength",
          sets: 4,
          reps: 8,
          weight_lbs: 225,
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      exerciseLogId = data.id;
      expect(data.id).toBeDefined();
      expect(data.exercise_name).toBe("Bench press");
    });

    test("GET - Retrieve exercise logs for date", async () => {
      const res = await api(`/api/exercise-logs?user_id=${testUserId}&date=${testDate}`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
      expect(typeof data.total_calories_burned).toBe("number");
    });

    test("POST - Create exercise log (cardio)", async () => {
      const res = await api("/api/exercise-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          exercise_name: "Running",
          exercise_type: "cardio",
          duration_minutes: 30,
          distance_miles: 3.1,
          calories_burned: 350,
        }),
      });
      await expectStatus(res, 201);
    });

    test("POST - Missing required exercise_type returns 400", async () => {
      const res = await api("/api/exercise-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          exercise_name: "Test exercise",
        }),
      });
      await expectStatus(res, 400);
    });

    test("POST - Invalid exercise_type returns 400", async () => {
      const res = await api("/api/exercise-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          exercise_name: "Test",
          exercise_type: "invalid_type",
        }),
      });
      await expectStatus(res, 400);
    });

    test("DELETE - Remove exercise log", async () => {
      const res = await api(`/api/exercise-logs/${exerciseLogId}`, { method: "DELETE" });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Weight logs endpoints", () => {
    test("POST - Create weight log", async () => {
      const res = await api("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
          weight_lbs: 180,
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      weightLogId = data.id;
      expect(data.id).toBeDefined();
      expect(data.weight_lbs).toBe(180);
    });

    test("GET - Retrieve weight logs", async () => {
      const res = await api(`/api/weight-logs?user_id=${testUserId}`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
    });

    test("GET - Retrieve weight logs with custom days parameter", async () => {
      const res = await api(`/api/weight-logs?user_id=${testUserId}&days=30`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
    });

    test("POST - Create another weight log for trend", async () => {
      const yesterdayDate = "2026-04-28";
      const res = await api("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: yesterdayDate,
          weight_lbs: 179.5,
        }),
      });
      await expectStatus(res, 201);
    });

    test("POST - Missing required field returns 400", async () => {
      const res = await api("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: testUserId,
          date: testDate,
        }),
      });
      await expectStatus(res, 400);
    });

    test("DELETE - Remove weight log", async () => {
      const res = await api(`/api/weight-logs/${weightLogId}`, { method: "DELETE" });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Progress endpoints", () => {
    test("GET - Retrieve progress metrics", async () => {
      const res = await api(`/api/progress/${testUserId}`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.weight_trend)).toBe(true);
      expect(Array.isArray(data.calorie_trend)).toBe(true);
      expect(Array.isArray(data.activity_trend)).toBe(true);
      expect(typeof data.weekly_lifting_volume).toBe("number");
      expect(typeof data.weekly_cardio_minutes).toBe("number");
    });

    test("GET - Retrieve progress with custom days parameter", async () => {
      const res = await api(`/api/progress/${testUserId}?days=60`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.weight_trend)).toBe(true);
      expect(Array.isArray(data.calorie_trend)).toBe(true);
    });

    test("GET - Retrieve progress for non-existent user", async () => {
      const res = await api(`/api/progress/nonexistent-user-xyz`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.weight_trend)).toBe(true);
    });
  });

  describe("Aptos Score endpoints", () => {
    test("GET - Calculate aptos score for user", async () => {
      const res = await api(`/api/aptos-score?user_id=${testUserId}`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(typeof data.score).toBe("number");
      expect(typeof data.label).toBe("string");
      expect(data.breakdown).toBeDefined();
    });

    test("GET - Calculate aptos score with custom days parameter", async () => {
      const res = await api(`/api/aptos-score?user_id=${testUserId}&days=14`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(typeof data.score).toBe("number");
      expect(data.breakdown).toBeDefined();
    });

    test("GET - Missing user_id returns 400", async () => {
      const res = await api("/api/aptos-score");
      await expectStatus(res, 400);
    });

    test("GET - Non-existent user profile returns 404", async () => {
      const res = await api("/api/aptos-score?user_id=nonexistent-user-xyz");
      await expectStatus(res, 404);
    });
  });

  describe("Community - Setup authentication", () => {
    test("Sign up first test user for community tests", async () => {
      const testUser = await signUpTestUser();
      authToken = testUser.token;
      expect(authToken).toBeDefined();
    });

    test("Sign up second test user for friend request tests", async () => {
      const testUser = await signUpTestUser();
      secondUserToken = testUser.token;
      secondUserId = testUser.user.id;
      expect(secondUserToken).toBeDefined();
      expect(secondUserId).toBeDefined();
    });
  });

  describe("Community - Users search endpoints", () => {
    test("GET - Search users by name", async () => {
      const res = await authenticatedApi("/api/users/search?q=test", authToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.users)).toBe(true);
    });

    test("GET - Search with empty query", async () => {
      const res = await authenticatedApi("/api/users/search?q=", authToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.users)).toBe(true);
    });
  });

  describe("Community - Friends endpoints", () => {
    test("GET - Retrieve friends list", async () => {
      const res = await authenticatedApi("/api/friends", authToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.friends)).toBe(true);
    });
  });

  describe("Community - Friend requests endpoints", () => {
    test("GET - Retrieve incoming friend requests", async () => {
      const res = await authenticatedApi("/api/friend-requests", authToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.requests)).toBe(true);
    });

    test("POST - Create friend request", async () => {
      const res = await authenticatedApi("/api/friend-requests", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: secondUserId,
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      friendRequestId = data.id;
      expect(data.id).toBeDefined();
      expect(data.recipient_id).toBe(secondUserId);
    });

    test("POST - Missing recipient_id returns 400", async () => {
      const res = await authenticatedApi("/api/friend-requests", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await expectStatus(res, 400);
    });

    test("PUT - Non-recipient cannot update friend request returns 403", async () => {
      const res = await authenticatedApi(`/api/friend-requests/${friendRequestId}`, authToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "declined",
        }),
      });
      await expectStatus(res, 403);
    });

    test("PUT - Update friend request status to accepted", async () => {
      const res = await authenticatedApi(`/api/friend-requests/${friendRequestId}`, secondUserToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "accepted",
        }),
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.status).toBe("accepted");
    });

    test("PUT - Invalid status returns 400", async () => {
      const res = await authenticatedApi(`/api/friend-requests/${friendRequestId}`, secondUserToken, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "invalid_status",
        }),
      });
      await expectStatus(res, 400);
    });
  });

  describe("Community - Feed endpoints", () => {
    test("GET - Retrieve community feed", async () => {
      const res = await authenticatedApi("/api/community/feed", authToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.posts)).toBe(true);
    });
  });

  describe("Community - Posts endpoints", () => {
    test("POST - Create workout post", async () => {
      const res = await authenticatedApi("/api/community/posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_type: "workout",
          title: "Great cardio session!",
          description: "Ran 5 miles today",
          data: '{"distance": 5, "duration": 45}',
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      communityPostId = data.id;
      expect(data.id).toBeDefined();
      expect(data.post_type).toBe("workout");
    });

    test("POST - Create meal post", async () => {
      const res = await authenticatedApi("/api/community/posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_type: "meal",
          title: "Healthy lunch prep",
          data: '{"meal": "grilled chicken and rice"}',
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      expect(data.post_type).toBe("meal");
    });

    test("POST - Missing required field returns 400", async () => {
      const res = await authenticatedApi("/api/community/posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_type: "workout",
          title: "Incomplete post",
        }),
      });
      await expectStatus(res, 400);
    });

    test("POST - Invalid post_type returns 400", async () => {
      const res = await authenticatedApi("/api/community/posts", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_type: "invalid",
          title: "Test post",
          data: "{}",
        }),
      });
      await expectStatus(res, 400);
    });
  });

  describe("Community - Like post endpoints", () => {
    test("POST - Toggle like on post", async () => {
      const res = await authenticatedApi(`/api/community/posts/${communityPostId}/like`, authToken, {
        method: "POST",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(typeof data.liked).toBe("boolean");
      expect(typeof data.likes_count).toBe("number");
    });
  });

  describe("VIP endpoints", () => {
    let vipEntryId: string;

    test("GET - Check VIP status with authentication", async () => {
      const res = await authenticatedApi("/api/vip/check", authToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(typeof data.isVip).toBe("boolean");
    });

    test("GET - Check VIP status without authentication returns 401", async () => {
      const res = await api("/api/vip/check");
      await expectStatus(res, 401);
    });

    test("GET - Get VIP list without authentication returns 401", async () => {
      const res = await api("/api/vip");
      await expectStatus(res, 401);
    });

    test("GET - Get VIP list with owner privileges returns 200", async () => {
      const res = await authenticatedApi("/api/vip", authToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.vips)).toBe(true);
    });

    test("GET - Get VIP list without owner privileges returns 403", async () => {
      const res = await authenticatedApi("/api/vip", secondUserToken);
      await expectStatus(res, 403);
    });

    test("POST - Add VIP entry without authentication returns 401", async () => {
      const res = await api("/api/vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "vip@example.com",
          label: "Premium user",
        }),
      });
      await expectStatus(res, 401);
    });

    test("POST - Add VIP entry with owner privileges returns 201", async () => {
      const res = await authenticatedApi("/api/vip", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "vip-test@example.com",
          label: "Premium user",
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      vipEntryId = data.vip.id;
      expect(vipEntryId).toBeDefined();
    });

    test("POST - Add VIP entry without owner privileges returns 403", async () => {
      const res = await authenticatedApi("/api/vip", secondUserToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "vip2@example.com",
          label: "Premium user",
        }),
      });
      await expectStatus(res, 403);
    });

    test("POST - Add VIP entry with missing email returns 400", async () => {
      const res = await authenticatedApi("/api/vip", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: "Premium user",
        }),
      });
      await expectStatus(res, 400);
    });

    test("DELETE - Remove VIP entry without authentication returns 401", async () => {
      const res = await api("/api/vip/test-id", { method: "DELETE" });
      await expectStatus(res, 401);
    });

    test("DELETE - Remove VIP entry without owner privileges returns 403", async () => {
      const res = await authenticatedApi(`/api/vip/${vipEntryId}`, secondUserToken, {
        method: "DELETE",
      });
      await expectStatus(res, 403);
    });

    test("DELETE - Remove VIP entry with nonexistent ID returns 404", async () => {
      const res = await authenticatedApi("/api/vip/nonexistent-vip-id", authToken, {
        method: "DELETE",
      });
      await expectStatus(res, 404);
    });

    test("DELETE - Remove VIP entry with owner privileges returns 200", async () => {
      const res = await authenticatedApi(`/api/vip/${vipEntryId}`, authToken, {
        method: "DELETE",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Account endpoints", () => {
    test("DELETE - Remove account without authentication returns 401", async () => {
      const res = await api("/api/account", { method: "DELETE" });
      await expectStatus(res, 401);
    });

    test("DELETE - Remove account with authentication returns 200", async () => {
      const testUser = await signUpTestUser();
      const res = await authenticatedApi("/api/account", testUser.token, {
        method: "DELETE",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
