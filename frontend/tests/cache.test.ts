import { renderHook, waitFor } from "@testing-library/react";
import { bustCache, readCache, useCachedData, writeCache } from "../lib/cache";

beforeEach(() => {
  localStorage.clear();
});

test("write then read returns the value", () => {
  writeCache("leads", [{ id: "a" }]);
  expect(readCache("leads", 60_000)).toEqual([{ id: "a" }]);
});

test("expired entries read as null and are evicted", () => {
  writeCache("leads", [1]);
  expect(readCache("leads", -1)).toBeNull();
  expect(localStorage.getItem("masalai-cache:v1:leads")).toBeNull();
});

test("corrupt entries read as null", () => {
  localStorage.setItem("masalai-cache:v1:bad", "not-json{{{");
  expect(readCache("bad", 60_000)).toBeNull();
});

test("bustCache clears by prefix and keeps the rest", () => {
  writeCache("leads", [1]);
  writeCache("lead:abc", { id: "abc" });
  writeCache("stats", { total: 2 });
  bustCache("lead");
  expect(readCache("leads", 60_000)).toBeNull();
  expect(readCache("lead:abc", 60_000)).toBeNull();
  expect(readCache("stats", 60_000)).toEqual({ total: 2 });
});

test("bustCache with no prefix clears everything", () => {
  writeCache("leads", [1]);
  writeCache("stats", {});
  bustCache();
  expect(readCache("leads", 60_000)).toBeNull();
  expect(readCache("stats", 60_000)).toBeNull();
});

test("hook renders cached data instantly, then revalidates", async () => {
  writeCache("leads", ["cached"]);
  const { result } = renderHook(() =>
    useCachedData("leads", async () => ["fresh"], { ttlMs: 60_000 })
  );
  expect(result.current.data).toEqual(["cached"]);
  expect(result.current.loading).toBe(false);
  await waitFor(() => expect(result.current.data).toEqual(["fresh"]));
  expect(readCache("leads", 60_000)).toEqual(["fresh"]);
});

test("hook loads from network when the cache is empty", async () => {
  const { result } = renderHook(() =>
    useCachedData("stats", async () => ({ total: 5 }), { ttlMs: 60_000 })
  );
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual({ total: 5 });
});

test("hook surfaces fetch errors when nothing is cached", async () => {
  const { result } = renderHook(() =>
    useCachedData("oops", async (): Promise<string> => {
      throw new Error("boom");
    }, { ttlMs: 60_000 })
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toBeNull();
  expect(result.current.error).toBe("boom");
});
