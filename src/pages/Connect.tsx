import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AthyxConnectCard } from "@/components/AthyxConnectCard";
import { Loader2 } from "lucide-react";

// The entire app, distilled: open it, see one button, bind Athyx. Nothing else.
// Signs in anonymously in the background — no email/code screen to sit through.
export default function Connect() {
  const { isLoading, isAuthenticated, signIn } = useAuth();
  const signingIn = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !signingIn.current) {
      signingIn.current = true;
      signIn("anonymous").catch(() => {
        signingIn.current = false;
      });
    }
  }, [isLoading, isAuthenticated, signIn]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <AthyxConnectCard />
      </div>
    </div>
  );
}
