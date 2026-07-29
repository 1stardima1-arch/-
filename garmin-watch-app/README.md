# Lactate — Garmin Connect IQ watch app

Shows the current Athyx FLUX I lactate reading (mmol/L) on a Garmin watch,
pushed from the AI Coach Android app over the Connect IQ Mobile SDK.

## Why not NFC?

The original idea was to have the watch read the FLUX I directly over NFC.
That's not possible: Connect IQ has no public API for the watch's NFC radio
— it's hard-locked to Garmin Pay, confirmed by Garmin's own developer forum.
So the data takes a different path:

```
FLUX I  --Bluetooth/NFC-->  Athyx phone app  --Athyx REST API-->  Convex backend
                                                                        |
                                                                (polled every 30s,
                                                                 see ../src/convex/crons.ts)
                                                                        v
Garmin watch (this app)  <--Connect IQ Mobile SDK--  AI Coach Android app
```

Because the official Athyx API is polled (not pushed), the watch shows a
value that's on the order of tens of seconds old, not an instant stream —
same as any other app polling a REST API. If a reading is older than 120s
the number turns grey/orange instead of its normal zone color.

## One-time setup

1. **Install the Connect IQ SDK** via the SDK Manager:
   https://developer.garmin.com/connect-iq/sdk/ (requires a free Garmin
   Connect IQ developer account). The SDK Manager also lets you install the
   simulator and browse the exact device product IDs (see step 3).
2. **Generate a developer key** (one time, used to sign your builds):
   ```
   openssl genrsa -out developer_key.pem 4096
   openssl pkcs8 -topk8 -inform PEM -outform DER -in developer_key.pem -out developer_key.der -nocrypt
   ```
3. **Match `manifest.xml` to your watch.** Open `manifest.xml` and edit the
   `<iq:products>` list so it contains your exact watch's product id (the
   default list covers common Forerunner/Venu models but may not have your
   specific one — check via the SDK Manager's "Manage Devices" screen).
4. **(Optional) Change the app UUID.** `manifest.xml`'s
   `<iq:application id="...">` and `WATCH_APP_ID` in
   `../android/app/src/main/java/com/aicoach/app/GarminBridgePlugin.java`
   must match exactly — they're the same app identified from both sides.
   The repo ships with one generated UUID already wired up in both places;
   only change it if you regenerate a new one (and update both files).

## Build & test

```bash
# From garmin-watch-app/
monkeyc -d <your-device-id> -f monkey.jungle -o bin/lactate.prg -y developer_key.der

# Run in the simulator
connectiq                      # launches the simulator
monkeydo bin/lactate.prg <your-device-id>
```

Since there's no phone connected in the simulator, `LactateStore` will stay
in the "Ожидание данных..." (waiting) state — that's expected. To see real
data in the simulator, use the simulator's own message-injection tool
(Connect IQ SDK docs → "Communicating with Mobile Apps" → simulator
section) and send a dictionary like `{"lactate" => 3.2, "zone" => 2, "age" => 5}`.

## Install on your watch

1. Connect the watch via USB (mass storage mode).
2. Copy `bin/lactate.prg` into `GARMIN/APPS/` on the watch.
3. Safely eject. The app appears in the watch's app list as **Lactate**.
4. On the phone, install the **AI Coach** Android app, connect Athyx on the
   Devices page (`ath_live_...` API key), and make sure **Garmin Connect
   Mobile** is installed and paired with the watch — that's the app the
   Connect IQ Mobile SDK actually talks to.
5. Open **Lactate** on the watch during a session; the value updates every
   time the Android app relays a new reading (roughly every 30s).

## Files

- `manifest.xml` — app id, target devices, permissions (`Communications`).
- `monkey.jungle` — Connect IQ project file.
- `source/LactateApp.mc` — registers for phone messages, launches the view.
- `source/LactateStore.mc` — holds the last reading (singleton module).
- `source/LactateView.mc` — draws the value, unit, zone color, and age.
- `source/LactateDelegate.mc` — input handling (minimal).
- `resources/` — strings and the launcher icon.
