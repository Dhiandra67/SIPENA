import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(String(key));
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  };
}

function ensureStorage(name: "localStorage" | "sessionStorage"): Storage {
  const descriptor =
    Object.getOwnPropertyDescriptor(window, name) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), name);

  if (descriptor && "value" in descriptor) {
    const candidate = descriptor.value as Storage | undefined;
    if (
      candidate &&
      typeof candidate.getItem === "function" &&
      typeof candidate.setItem === "function" &&
      typeof candidate.removeItem === "function" &&
      typeof candidate.clear === "function"
    ) {
      return candidate;
    }
  }

  const fallback = createMemoryStorage();
  Object.defineProperty(window, name, {
    value: fallback,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, name, {
    value: fallback,
    configurable: true,
    writable: true,
  });
  return fallback;
}

ensureStorage("localStorage");
ensureStorage("sessionStorage");

beforeEach(() => {
  ensureStorage("localStorage").clear();
  ensureStorage("sessionStorage").clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
