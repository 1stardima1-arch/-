# Lactate — Garmin Connect IQ watch app

Shows the current Athyx FLUX I lactate reading (mmol/L) on a Garmin watch.

## Architecture

The watch fetches from Athyx **directly** — it does not depend on the
Android app or on Bluetooth messages from a phone app:

```
Athyx REST API  <--HTTPS (via phone's internet tether)--  Garmin watch
                                                            (background
                                                             service polls
                                                             every 5 min,
                                                             the fastest
                                                             Garmin allows
                                                             for a Data
                                                             Field's
                                                             background
                                                             events)
```

This changed from an earlier design where the Android app polled Athyx and
pushed readings to the watch over the Connect IQ Mobile SDK. That doesn't
work for a Data Field: **Data Field apps aren't allowed to use
`Communications` from the foreground app** — `registerForPhoneAppMessages`
compiles fine and can even appear to work in the simulator, but crashes
real hardware (which is why the field would show up in "Add Field" and then
the watch would reboot and drop it). Communications — including web
requests — is only permitted from a Data Field's **background service**,
so that's what fetches from Athyx now (`LactateServiceDelegate.mc`).

One consequence: the Android app is no longer required for the watch to
work. It's still useful for pasting/checking your Athyx key and seeing the
current reading on your phone, but the watch's own Athyx key (entered via
Garmin Connect Mobile, see setup below) is what actually drives the field.

## Why not NFC?

The original idea was to have the watch read the FLUX I directly over NFC.
That's not possible: Connect IQ has no public API for the watch's NFC radio
— it's hard-locked to Garmin Pay, confirmed by Garmin's own developer forum.

## One-time setup

1. **Install the Connect IQ SDK** via the SDK Manager:
   https://developer.garmin.com/connect-iq/sdk/ (requires a free Garmin
   Connect IQ developer account). The SDK Manager also lets you install the
   simulator and browse the exact device product IDs (see step 3). You can
   skip this if you're building via `.github/workflows/build-watch-app.yml`
   instead (see that file).
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
   `<iq:application id="...">` is this app's identity on the watch; only
   change it if you regenerate a new one.

## Build & test

```bash
# From garmin-watch-app/
monkeyc -d <your-device-id> -f monkey.jungle -o bin/lactate.prg -y developer_key.der

# Run in the simulator
connectiq                      # launches the simulator
monkeydo bin/lactate.prg <your-device-id>
```

The simulator can trigger the background service manually (Simulation →
Trigger Background Event in the simulator UI) instead of waiting 5 minutes.
Set the Athyx key first via the simulator's App Settings (gear icon).

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
4. **Enter your Athyx API key in the watch's app settings** (this is what
   the background service actually uses — the Android app's key is
   separate, just for the phone-side display):
   - Open **Garmin Connect Mobile** on your phone → your watch → **More** →
     **Connect IQ Store / My apps** (wording varies by app version) →
     **Lactate** → **Settings** (a gear icon) → paste your `ath_live_...`
     key → save & sync to the watch.
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
6. The field updates roughly every 5 minutes — that's Garmin's floor for
   background events on a Data Field, not something the app can speed up.
   Right after installing/setting the key it can take up to 5 minutes for
   the first reading to appear.

### If Lactate still doesn't show up in Connect IQ Fields after rebuilding

This app's UUID used to be registered on the watch as a *standalone app*
(`type="watch-app"`), before it became a data field. Garmin's own app
registry on some watches is known to get stuck treating a UUID as its
original type even after you sideload a new `.prg` with a different
`type` — see [Garmin's Connect IQ dev forum on this exact
problem](https://forums.garmin.com/developer/connect-iq/f/discussion/3303/sideload-a-data-field).
If this happens again, the fix is a fresh UUID in `manifest.xml`.

### If the watch reboots / drops the field right after adding it

That was the old direct-phone-Communications bug described above under
Architecture — it should be fixed as of the `LactateServiceDelegate`
background-service rewrite. If it still happens, it means something in the
background service itself is crashing (not the Communications-in-foreground
issue); check the simulator's background event trigger first since it logs
exceptions to the console, which a real watch does not.

## Files

- `manifest.xml` — app id, target devices, permissions (`Communications`),
  `type="datafield"` (shows up as an addable field on activity data
  screens rather than a standalone app in the Activities list).
- `monkey.jungle` — Connect IQ project file.
- `source/LactateApp.mc` — registers the 5-min background poll, hands
  background data off to `LactateStore`, launches the field.
- `source/LactateServiceDelegate.mc` — the actual Athyx polling: reads the
  API key from this app's Garmin Connect Mobile settings, calls
  `Communications.makeWebRequest`, parses the response, hands the reading
  back via `Background.exit`.
- `source/LactateStore.mc` — holds the last reading (singleton module).
- `source/LactateView.mc` — the data field itself: draws the value, unit,
  zone color, and age.
- `resources/` — strings, launcher icon, and the App Settings
  (`settings/settings.xml` + `settings/properties.xml`) that back the
  Garmin Connect Mobile settings screen where the Athyx key is entered.
