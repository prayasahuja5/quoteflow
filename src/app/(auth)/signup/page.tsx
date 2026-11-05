import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up · Quoteflow" };

export default function SignupPage() {
  return <SignupForm />;
}
