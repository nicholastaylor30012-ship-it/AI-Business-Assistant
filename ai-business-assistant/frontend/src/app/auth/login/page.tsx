"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useTheme } from "@/components/layout/Providers";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await authAPI.login(data.email, data.password);
      const { access_token, refresh_token, user } = res.data;
      setAuth(user, access_token, refresh_token);
      toast.success(`Welcome back, ${user.full_name.split(" ")[0]}!`);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Login failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ background: "white" }} />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10" style={{ background: "white" }} />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full opacity-5" style={{ background: "white" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg">BizAssist AI</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Your intelligent<br />workplace companion
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-sm">
            Access company knowledge, generate documents, and get instant answers — all in one place.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: "📄", text: "Upload and query company documents" },
            { icon: "🤖", text: "AI-powered answers from your knowledge base" },
            { icon: "📊", text: "Generate reports and analyze data" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-blue-100">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>BizAssist AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Sign in
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="font-medium" style={{ color: "var(--brand)" }}>
                Create one
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@company.com"
                className="input-base"
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="input-base pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-xl text-sm" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
            <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>Demo credentials</p>
            <p>Admin: admin@company.com / Admin123!</p>
            <p>Staff: staff@company.com / Staff123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
