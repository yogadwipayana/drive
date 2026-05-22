import RegisterForm from "./RegisterForm";

// Render dynamically so middleware can inject the per-request CSP nonce
// into Next.js's script tags. Without this, /register is statically
// prerendered and its scripts get blocked by `strict-dynamic` at runtime.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <RegisterForm />;
}
