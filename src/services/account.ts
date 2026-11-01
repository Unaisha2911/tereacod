import { create } from "zustand";
import type { AccountPreferences, UserProfile } from "@/types";

/**
 * ACCOUNT SERVICE (API-backed) + AUTH STORE
 * -----------------------------------------
 * Real authentication against /api/v1/auth/*. The useAuth store is hydrated
 * once by the app bootstrap provider (GET /api/v1/auth/session) and updated
 * by sign-in/sign-out.
 */

export interface AuthResult {
  ok: boolean;
  message: string;
  /** Present on register/forgot-password when a dev OTP was surfaced. */
  email?: string;
  devCode?: string;
}

interface AuthState {
  user: UserProfile | null;
  isStaff: boolean;
  hydrated: boolean;
  setAuth: (user: UserProfile | null, isStaff: boolean) => void;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isStaff: false,
  hydrated: false,
  setAuth: (user, isStaff) => set({ user, isStaff }),
  setHydrated: () => set({ hydrated: true }),
}));

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string; fields?: Record<string, string> };
    };
    const fieldMessage = body.error?.fields ? Object.values(body.error.fields)[0] : undefined;
    return body.error?.message ?? fieldMessage ?? fallback;
  } catch {
    return fallback;
  }
}

/** Bootstrap hydration — called once by the app bootstrap provider. */
export async function hydrateAuthFromServer(): Promise<void> {
  try {
    const response = await fetch("/api/v1/auth/session", { headers: { accept: "application/json" } });
    if (response.ok) {
      const body = (await response.json()) as {
        data: { user: UserProfile | null; isStaff: boolean };
      };
      useAuth.getState().setAuth(body.data.user ?? null, Boolean(body.data.isStaff));
    }
  } catch {
    // Offline — anonymous until next load.
  } finally {
    useAuth.getState().setHydrated();
  }
}

export const accountService = {
  async signIn(
    email: string,
    password: string,
    turnstileToken?: string | null
  ): Promise<AuthResult & { isStaff?: boolean }> {
    const response = await fetch("/api/v1/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, turnstileToken: turnstileToken ?? undefined }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: {
        user?: { displayName?: string; isStaff?: boolean };
      };
      error?: { message?: string };
    };
    if (!response.ok || !body.data?.user) {
      return { ok: false, message: body.error?.message ?? "Sign-in failed. Please try again." };
    }
    const bootstrap = await fetch("/api/v1/auth/session", { headers: { accept: "application/json" } });
    let staff = Boolean(body.data.user.isStaff);
    if (bootstrap.ok) {
      const data = (await bootstrap.json()) as {
        data: { user: UserProfile | null; isStaff: boolean };
      };
      staff = Boolean(data.data.isStaff);
      useAuth.getState().setAuth(data.data.user ?? null, staff);
    }
    return {
      ok: true,
      message: `Welcome back${body.data.user.displayName ? `, ${body.data.user.displayName}` : ""}!`,
      isStaff: staff,
    };
  },

  async register(payload: {
    email: string;
    password: string;
    displayName: string;
    marketingOptIn?: boolean;
    researchInvites?: boolean;
    turnstileToken?: string | null;
  }): Promise<AuthResult> {
    const response = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        displayName: payload.displayName,
        marketingOptIn: payload.marketingOptIn,
        researchInvites: payload.researchInvites,
        turnstileToken: payload.turnstileToken ?? undefined,
      }),
    });
    if (!response.ok) {
      return { ok: false, message: await parseError(response, "Registration failed. Please try again.") };
    }
    const body = (await response.json().catch(() => ({}))) as {
      data?: { email?: string };
    };
    return {
      ok: true,
      message: "Account created — you are signed in and ready to shop.",
      email: body.data?.email,
    };
  },

  async signOut(): Promise<AuthResult> {
    await fetch("/api/v1/auth/sign-out", { method: "POST" });
    // Drop user-scoped client state — the stale cart/saved caches would
    // otherwise bleed into the next session on this browser.
    useAuth.getState().setAuth(null, false);
    const { useCart } = await import("@/services/cart");
    const { useSavedItems } = await import("@/services/saved-items");
    const { usePlacedOrders } = await import("@/services/placed-orders");
    useCart.getState().setLines([]);
    useSavedItems.getState().setItems([]);
    // Session-placed order receipts live in sessionStorage — on a shared
    // browser the next visitor could otherwise reopen the previous
    // session's confirmations from /account/orders.
    usePlacedOrders.getState().clear();
    return { ok: true, message: "Signed out." };
  },

  async requestPasswordReset(email: string): Promise<AuthResult> {
    const response = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      return { ok: false, message: await parseError(response, "Could not start the reset.") };
    }
    const body = (await response.json().catch(() => ({}))) as {
      data?: { message?: string; devCode?: string };
    };
    return {
      ok: true,
      message: body.data?.message ?? "If an account exists for this email, a 6-digit reset code is on its way.",
      email,
      devCode: body.data?.devCode,
    };
  },

  async getProfile(): Promise<UserProfile> {
    const response = await fetch("/api/v1/account/me", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Sign in to view your profile.");
    const body = (await response.json()) as { data: UserProfile };
    return body.data;
  },

  async updateProfile(patch: { displayName?: string; phone?: string | null }): Promise<AuthResult> {
    const response = await fetch("/api/v1/account/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      return { ok: false, message: await parseError(response, "Could not save your profile.") };
    }
    const body = (await response.json()) as { data: UserProfile };
    useAuth.getState().setAuth(body.data, useAuth.getState().isStaff);
    return { ok: true, message: "Profile saved." };
  },

  async getPreferences(): Promise<AccountPreferences> {
    const response = await fetch("/api/v1/account/preferences", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Sign in to view your preferences.");
    const body = (await response.json()) as { data: AccountPreferences };
    return body.data;
  },

  async updatePreferences(patch: Record<string, unknown>): Promise<AuthResult> {
    const response = await fetch("/api/v1/account/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      return { ok: false, message: await parseError(response, "Could not save your preferences.") };
    }
    return { ok: true, message: "Preferences saved." };
  },

  async sessions(): Promise<Array<{ id: string; device: string; current: boolean; lastActive: string }>> {
    const response = await fetch("/api/v1/account/sessions", { headers: { accept: "application/json" } });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      data: { sessions: Array<{ id: string; device: string; current: boolean; lastActive: string }> };
    };
    return body.data.sessions;
  },

  async revokeSession(id: string): Promise<void> {
    await fetch(`/api/v1/account/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async revokeOtherSessions(): Promise<void> {
    await fetch("/api/v1/account/sessions/revoke-others", { method: "POST" });
  },

  async resetPassword(email: string, code: string, password: string): Promise<AuthResult> {
    const response = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password }),
    });
    if (!response.ok) {
      return { ok: false, message: await parseError(response, "That code is incorrect or has expired.") };
    }
    return { ok: true, message: "Password updated. Sign in with your new password." };
  },

  async submitPrivacyRequest(kind: "access" | "deletion"): Promise<AuthResult> {
    const response = await fetch("/api/v1/account/privacy-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (!response.ok) {
      return { ok: false, message: await parseError(response, "Could not submit the request.") };
    }
    const body = (await response.json().catch(() => ({}))) as { data?: { message?: string } };
    return {
      ok: true,
      message: body.data?.message ?? "Your request has been recorded — our privacy team will respond within 30 days.",
    };
  },
};
