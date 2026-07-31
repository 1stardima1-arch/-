import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { AthyxConnectCard } from "@/components/AthyxConnectCard";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

// The entire app, distilled: open it, see one button, bind Athyx. Nothing else.
export default function Connect() {
  const { isLoading, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => signOut()}
        className="absolute top-4 right-4 text-muted-foreground"
      >
        <LogOut className="h-4 w-4" />
      </Button>
      <div className="w-full max-w-sm">
        <AthyxConnectCard />
      </div>
    </div>
  );
}
