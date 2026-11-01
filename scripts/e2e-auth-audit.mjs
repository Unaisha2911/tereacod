/**
 * E2E verification of the auth surface + public pages.
 * Runs against the live dev server on :3000. Uses devCode (APP_ENV=development)
 * to complete the password-reset OTP flow. Read-only against seed data except
 * the test users it registers.
 *
 * Auth model (simplified): one unified /account/sign-in for every role,
 * console at the plain /admin URL (anonymous → 307 sign-in, non-staff →
 * /restricted), no email verification at signup (accounts are active and
 * verified immediately), no age verification.
 */
const BASE = "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@tereacod.ae";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin#TereaCOD2025";

let pass = 0, failCount = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { failCount++; failures.push(name); console.log(`  FAIL ${name} ${detail}`); }
}

async function req(path, opts = {}) {
  return fetch(BASE + path, { redirect: "manual", ...opts });
}

async function main() {
  console.log("== 1. unified console entry ==");
  let r = await req("/admin");
  check("/admin anonymous → 307 to sign-in", r.status === 307 && (r.headers.get("location") || "").includes("/account/sign-in"), `got ${r.status} ${r.headers.get("location")}`);
  r = await req("/admin/users");
  check("/admin/users anonymous → 307 to sign-in", r.status === 307 && (r.headers.get("location") || "").includes("/account/sign-in"), `got ${r.status}`);

  console.log("== 2. admin sign-in via the shared form API ==");
  r = await req("/api/v1/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const signIn = await r.json().catch(() => ({}));
  check("sign-in 200", r.status === 200, `got ${r.status} ${JSON.stringify(signIn).slice(0, 200)}`);
  check("isStaff true", signIn?.data?.user?.isStaff === true, JSON.stringify(signIn).slice(0, 200));
  const setCookie = r.headers.get("set-cookie") || "";
  const adminCookie = setCookie.split(";")[0];
  check("session cookie set", adminCookie.length > 0);

  console.log("== 3. console pages open with the admin session ==");
  r = await req("/admin", { headers: { cookie: adminCookie } });
  check("console root 200", r.status === 200, `got ${r.status}`);
  r = await req("/admin/users", { headers: { cookie: adminCookie } });
  check("console /users 200", r.status === 200, `got ${r.status}`);
  r = await req("/admin/settings", { headers: { cookie: adminCookie } });
  check("console /settings 200", r.status === 200, `got ${r.status}`);

  console.log("== 4. friction-free customer signup ==");
  const cust = { email: `e2e-${Date.now()}@example.com`, password: "Str0ngPassphrase!", displayName: "E2E Tester" };
  r = await req("/api/v1/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cust),
  });
  const reg = await r.json().catch(() => ({}));
  check("register 201", r.status === 201, `got ${r.status} ${JSON.stringify(reg).slice(0, 200)}`);
  check("no verificationRequired in response", reg?.data?.verificationRequired === undefined, JSON.stringify(reg).slice(0, 200));
  check("no devCode in response", reg?.data?.devCode === undefined);

  // The account is usable immediately — no OTP detour.
  r = await req("/api/v1/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: cust.email, password: cust.password }),
  });
  const custSignIn = await r.json().catch(() => ({}));
  const custCookie = (r.headers.get("set-cookie") || "").split(";")[0];
  check("fresh sign-in 200", r.status === 200, `got ${r.status}`);
  check("customer isStaff false", custSignIn?.data?.user?.isStaff === false, JSON.stringify(custSignIn).slice(0, 200));

  console.log("== 5. non-staff cannot open the console ==");
  r = await req("/admin", { headers: { cookie: custCookie } });
  check("customer at /admin → 307 to /restricted", r.status === 307 && (r.headers.get("location") || "").includes("/restricted"), `got ${r.status} ${r.headers.get("location")}`);
  // The retired flows are gone for good.
  r = await req("/api/v1/auth/verify-email", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: cust.email, code: "000000" }),
  });
  check("verify-email API removed → 404", r.status === 404, `got ${r.status}`);
  r = await req("/account/verify-email");
  check("/account/verify-email page gone → 307 sign-in", r.status === 307 && (r.headers.get("location") || "").includes("/account/sign-in"), `got ${r.status}`);

  console.log("== 6. password reset flow (OTP retained) ==");
  r = await req("/api/v1/auth/forgot-password", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: cust.email }),
  });
  const forgot = await r.json().catch(() => ({}));
  check("forgot-password 200", r.status === 200, `got ${r.status}`);
  const resetCode = forgot?.data?.devCode;
  check("reset devCode present", typeof resetCode === "string" && /^\d{6}$/.test(resetCode || ""), `${resetCode}`);
  const newPass = "An0therPassphrase!";
  r = await req("/api/v1/auth/reset-password", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: cust.email, code: resetCode, password: newPass }),
  });
  check("reset-password 200", r.status === 200, `got ${r.status}`);
  // old password must now fail
  r = await req("/api/v1/auth/sign-in", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: cust.email, password: cust.password }),
  });
  check("old password rejected after reset", r.status === 401, `got ${r.status}`);
  // new password works
  r = await req("/api/v1/auth/sign-in", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: cust.email, password: newPass }),
  });
  check("new password accepted", r.status === 200, `got ${r.status}`);

  console.log("== 7. weak password policy ==");
  r = await req("/api/v1/auth/register", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `weak-${Date.now()}@example.com`, password: "short1", displayName: "Weak" }),
  });
  check("short password rejected 422", r.status === 422, `got ${r.status}`);
  r = await req("/api/v1/auth/register", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `weak-${Date.now()}@example.com`, password: "longenoughwithoutdigit", displayName: "Weak" }),
  });
  check("no-digit password rejected 422", r.status === 422, `got ${r.status}`);

  console.log("== 8. public page sweep ==");
  for (const p of ["/", "/discover", "/collections", "/brand", "/origin/duty-free", "/help/faq", "/legal/terms", "/compliance", "/about", "/contact", "/account/sign-in", "/account/register", "/account/forgot-password", "/search?q=tesla", "/sitemap.xml", "/robots.txt"]) {
    r = await req(p);
    check(`${p} → 200`, r.status === 200, `got ${r.status}`);
  }

  console.log("== 9. account gate ==");
  r = await req("/account");
  check("/account anonymous → 307 to sign-in", r.status === 307 && (r.headers.get("location") || "").includes("/account/sign-in"), `got ${r.status} ${r.headers.get("location")}`);

  console.log(`\nRESULT: ${pass} passed, ${failCount} failed`);
  if (failures.length) { console.log("FAILURES:"); for (const f of failures) console.log(` - ${f}`); process.exit(1); }
}

main().catch((e) => { console.error("E2E crashed:", e); process.exit(2); });
