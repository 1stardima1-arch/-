import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Sparkles, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps) {
  const { signIn, signOut, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"idle" | "sent" | "verifying">("idle");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const REDIRECT_TO = redirectAfterAuth ?? "/dashboard";

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(REDIRECT_TO, { replace: true });
  }, [isLoading, isAuthenticated, navigate, REDIRECT_TO]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    try {
      await signIn("emailOtp", { email: email.trim(), flow: "signInOrSignUp" });
      setStep("sent");
      toast.success("Код отправлен на почту");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setIsSubmitting(true);
    try {
      await signIn("emailOtp", { email: email.trim(), flow: "verification", verificationCode: code.trim() });
      setStep("verifying");
      toast.success("Вход выполнен");
    } catch {
      toast.error("Неверный код. Попробуй ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(120,80,255,0.08),transparent_70%)]" />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm relative z-10"
        >
          {step === "idle" && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-purple-500/20">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Вход</h1>
                <p className="text-sm text-muted-foreground">Введи email — пришлём код для входа</p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-4">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50 focus:bg-white/[0.06] transition-all"
                  required
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-medium shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-2" />Отправить код</>}
                </Button>
              </form>
            </div>
          )}

          {(step === "sent" || step === "verifying") && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Проверь почту</h1>
                <p className="text-sm text-muted-foreground">
                  Код отправлен на <span className="text-foreground font-medium">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Введи код из 6 цифр"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="h-14 rounded-xl bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50 focus:bg-white/[0.06] text-center text-2xl tracking-[0.5em] font-mono transition-all"
                  required
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || code.length < 6}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-medium shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4 mr-2" />Продолжить</>}
                </Button>
              </form>

              <button
                onClick={() => { setStep("idle"); setCode(""); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Назад к вводу email
              </button>
            </div>
          )}

          {step === "verifying" && (
            <div className="text-center py-12 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
              <p className="text-sm text-muted-foreground">Входим...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  const { isLoading: authLoading } = useAuth();
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }
  return <Auth {...props} />;
}
