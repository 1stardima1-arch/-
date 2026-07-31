import { AthyxConnectCard } from "@/components/AthyxConnectCard";

// The entire app, distilled: open it, see one button, bind Athyx. Nothing
// else — no account, no backend, no login screen. The API key lives only
// on this device.
export default function Connect() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <AthyxConnectCard />
      </div>
    </div>
  );
}
