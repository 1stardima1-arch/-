# Lactate — Garmin Connect IQ watch app

Shows the current Athyx FLUX I lactate reading (mmol/L) on a Garmin watch,
pushed from the AI Coach Android app over the Connect IQ Mobile SDK.

## Why not NFC?

The original idea was to have the watch read the FLUX I directly over NFC.
That's not possible: Connect IQ has no public API for the watch's NFC radio
— it's hard-locked to Garmin Pay, confirmed by Garmin's own developer forum.
So the data takes a different path:

```
FLUX I  --Bluetooth/NFC-->  Athyx phone app  --Athyx REST API-->  AI Coach Android app
                                                                  (polled every ~30s,
                                                                   natively — see
                                                                   GarminBridgePlugin
                                                                   .fetchAthyxLatest)
                                                                        |
                                                                Connect IQ Mobile SDK
                                                                        v
                                                              Garmin watch (this app)
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

0. **Enable Developer Mode on the watch first** (one-time, per watch) — by
   default Garmin firmware only trusts Connect IQ Store apps and will
   silently delete a sideloaded one after a while. Install Garmin Express
   on a computer, connect the watch over USB, open the device's page, and
   look for a "Developer Mode" toggle (often hidden behind repeatedly
   tapping the software-version/about text, the same pattern as unlocking
   Android's developer options). The exact spot moves between Garmin
   Express versions — search "Garmin Express enable developer mode" for
   your specific watch model if it isn't obvious. This does not require a
   registered Connect IQ Store developer account, only the self-generated
   `developer_key.der` from step 2 above.
1. Connect the watch via USB (mass storage mode).
2. Copy `bin/lactate.prg` into `GARMIN/APPS/` on the watch.
3. Safely eject.
4. On the phone, install the **AI Coach** Android app, connect Athyx (
   `ath_live_...` API key), and make sure **Garmin Connect Mobile** is
   installed and paired with the watch — that's the app the Connect IQ
   Mobile SDK actually talks to.
5. **Add Lactate as a data field to an activity** (this is a Connect IQ
   Data Field, not a standalone app — it doesn't show up in the
   Activities/Apps launcher list; it goes onto an existing sport's data
   screens, same as Pace or Heart Rate). Two ways to add it:
   - **On the watch:** start (or open the settings for) an activity like
     Running/Roller Skiing/XC Skiing → hold the data screen you want →
     Edit → Add Field → category **Connect IQ Fields** → **Lactate**.
   - **In Garmin Connect Mobile:** More → device settings → the activity
     (e.g. Running) → Data Screens → edit a screen → Add Field →
     **Connect IQ Fields** → **Lactate** → sync to the watch.
   Repeat per activity type you want it on (Running, Roller Skiing,
   Skiing, ...) — a data field has to be added separately to each sport's
   screens.
6. Start that activity; the field updates every time the phone relays a
   new reading (roughly every 30s).

### If Lactate still doesn't show up in Connect IQ Fields after rebuilding

This app's UUID used to be registered on the watch as a *standalone app*
(`type="watch-app"`), before it became a data field. Garmin's own app
registry on some watches is known to get stuck treating a UUID as its
original type even after you sideload a new `.prg` with a different
`type` — see [Garmin's Connect IQ dev forum on this exact
problem](https://forums.garmin.com/developer/connect-iq/f/discussion/3303/sideload-a-data-field).
The fix is a fresh UUID, which this repo's `manifest.xml` and
`GarminBridgePlugin.java`'s `WATCH_APP_ID` already carry as of this
commit — **both must always match, and both must be rebuilt/reinstalled
together** (a new watch `.prg` paired with an old phone APK, or vice
versa, will silently fail to communicate since they're addressing
different app IDs). If you ever regenerate the UUID again (VS Code:
Command Palette → "Monkey C: Regenerate UUID"), update both files.

## Files

- `manifest.xml` — app id, target devices, permissions (`Communications`),
  `type="datafield"` (shows up as an addable field on activity data
  screens rather than a standalone app in the Activities list).
- `monkey.jungle` — Connect IQ project file.
- `source/LactateApp.mc` — registers for phone messages, launches the field.
- `source/LactateStore.mc` — holds the last reading (singleton module).
- `source/LactateView.mc` — the data field itself: draws the value, unit,
  zone color, and age.
- `resources/` — strings and the launcher icon.
