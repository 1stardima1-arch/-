import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PolarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const exchangePolarCode = useAction(api.sync.polar.exchangePolarCode);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setStatus("error");
      setError(`Polar authorization denied: ${errorParam}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setError("No authorization code received from Polar.");
      return;
    }

    if (!user?._id) {
      setStatus("error");
      setError("You must be logged in to connect Polar.");
      return;
    }

    const redirectUri = `${window.location.origin}/oauth/polar/callback`;

    exchangePolarCode({ userId: user._id, code, redirectUri })
      .then((result) => {
        if (result.success) {
          setStatus("success");
          setTimeout(() => navigate("/devices"), 2000);
        } else {
          setStatus("error");
          setError(result.error || "Failed to exchange Polar code.");
        }
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      });
  }, [searchParams, user?._id, navigate, exchangePolarCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass p-8 rounded-2xl max-w-md w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h2 className="text-lg font-semibold">Подключение Polar...</h2>
            <p className="text-sm text-muted-foreground">
              Обмениваем код авторизации на токен доступа.
            </p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-chart-2 mx-auto" />
            <h2 className="text-lg font-semibold">Polar подключён!</h2>
            <p className="text-sm text-muted-foreground">
              Ваш аккаунт Polar успешно подключён. Перенаправляем на страницу устройств...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-chart-5 mx-auto" />
            <h2 className="text-lg font-semibold">Ошибка подключения</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => navigate("/devices")}
              className="mt-4 px-4 py-2 rounded-lg glass-highlight text-sm"
            >
              Вернуться к устройствам
            </button>
          </>
        )}
      </div>
    </div>
  );
}
