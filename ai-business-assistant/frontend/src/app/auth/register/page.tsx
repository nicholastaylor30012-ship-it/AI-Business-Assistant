"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, ArrowRight, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "@/lib/api";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await authAPI.register({
        email: data.email,
        full_name: data.full_name,
        password: data.password,
      });
      toast.success("Account created! Please sign in.");
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>BizAssist AI</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Create your account</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Already have one?{" "}
            <Link href="/auth/login" style={{ color: "var(--brand)" }} className="font-medium">Sign in</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Full name</label>
            <input {...register("full_name")} placeholder="Jane Smith" className="input-base" />
            {errors.full_name && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input {...register("email")} type="email" placeholder="you@company.com" className="input-base" />
            {errors.email && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Password</label>
            <div className="relative">
              <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="At least 8 characters" className="input-base pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Confirm password</label>
            <input {...register("confirm_password")} type="password" placeholder="Repeat your password" className="input-base" />
            {errors.confirm_password && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{errors.confirm_password.message}</p>}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create account <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
