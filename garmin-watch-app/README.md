# Lactate — Garmin Connect IQ watch app

Shows the current Athyx FLUX I lactate reading (mmol/L) on a Garmin watch.

## Architecture

Two paths feed the same field, both handled from a **background service**
(`LactateServiceDelegate.mc`) — never from the foreground app:

```
                    push, as soon as the phone has a fresh reading
Athyx REST API --> Android app --> Connect IQ Mobile SDK --> onPhoneAppMessage \
  (polled ~3 min,                                                              \
   Athyx's own                                                                  > Garmin watch
   rate-limit floor)                                                           /   (Lactate)
Athyx REST API <-------------- HTTPS, via phone's internet tether ----------- /
                    onTemporalEvent, every 5 min (Garmin's floor for a
                    Data Field's own background events) — fallback for
                    whenever the phone app isn't running

```

Both paths exist because of the same underlying restriction: **Data Field
apps aren't allowed to use `Communications` from the foreground app** —
`registerForPhoneAppMessages` there compiles fine and can even appear to
work in the simulator, but crashes real hardware (which is why the field
used to show up in "Add Field" and then the watch would reboot and drop
it). Communications — phone push messages and web requests alike — is only
permitted from a Data Field's background service.

The phone-push path is the fast one in practice: the Android app already
polls Athyx (throttled to ~3 min — Athyx's own API rate limits, not
anything Garmin-imposed) and relays over the Connect IQ Mobile SDK the
moment it has a new reading, so **that's the realistic floor for
"real-time" here — there's no faster source to relay from**. The watch's
own direct polling (`onTemporalEvent`, capped at 5 min by Garmin) only
matters when the phone app isn't installed, isn't paired, or isn't
running — otherwise the phone push arrives first and the watch just
displays whichever update lands most recently. The watch's own Athyx key
only matters for that fallback, and — because this app is sideloaded, not
installed from the Connect IQ Store — Garmin Connect Mobile can't be used
to set it (see setup below); the Android app's key is what actually drives
most updates and needs no such workaround.

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
4. **For the fast path:** install the Android app, connect Athyx there
   (`ath_live_...` key), and make sure **Garmin Connect Mobile** is
   installed and paired with the watch — that's what the Connect IQ Mobile
   SDK actually talks to when relaying a fresh reading. This is enough on
   its own; the rest of this step is optional.
   **For the fallback path (optional):** Garmin Connect Mobile's app
   settings screen — and its "My Data Fields" list — only works for apps
   installed from the Connect IQ Store. **A sideloaded app never appears
   there and its Application.Properties can't be set from the phone at
   all** — that's a Garmin platform limitation, confirmed on their own
   forums, not something to work around in this app's code. Skip this
   unless you specifically want the 5-min self-poll fallback to have a
   key; it needs a settings file copied to the watch by hand instead —
   ask if you want that documented.
5. **Add Lactate as a data field to an activity — on the watch itself,
   not through the phone.** This is a Connect IQ Data Field, not a
   standalone app: it doesn't show up in the Activities/Apps launcher
   list, and being sideloaded, it also won't show up in Garmin Connect
   Mobile's "My Data Fields"/app list (see above — that's normal, not a
   sign it failed to install). Start or open the settings for an activity
   like Running/Roller Skiing/XC Skiing on the watch, open the data
   screen you want to edit, choose Add Field, and look for it under
   **Connect IQ Fields** → **Lactate**. Repeat per activity type you want
   it on (Running, Roller Skiing, Skiing, ...) — a data field has to be
   added separately to each sport's screens.
6. Start that activity. With the Android app running and the watch paired,
   the field updates as soon as the phone has a fresh Athyx reading —
   roughly every ~3 min, since that's Athyx's own rate-limit floor, not a
   Garmin restriction. If the phone app isn't running, the watch's own
   fallback poll still updates it every 5 min (Garmin's floor for a Data
   Field's background events).

### "Lactate isn't in Garmin Connect Mobile's app/field list"

Expected, not a bug — see step 4-5 above. That phone screen only lists
Connect IQ Store installs; it will never show a sideloaded app no matter
how correctly it's installed. Check the *watch itself* (step 5's on-device
Add Field flow) instead of the phone to see whether it's really missing.

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
- `source/LactateApp.mc` — registers the 5-min fallback background poll,
  hands background data off to `LactateStore`, launches the field.
- `source/LactateServiceDelegate.mc` — the background service: relays
  whatever the phone pushes (`onPhoneAppMessage`, the fast path) and, as a
  fallback, polls Athyx directly every 5 min (`onTemporalEvent`, reading
  the API key from this app's Garmin Connect Mobile settings and calling
  `Communications.makeWebRequest`). Either path hands the reading back via
  `Background.exit`.
- `source/LactateStore.mc` — holds the last reading (singleton module).
- `source/LactateView.mc` — the data field itself: draws the value, unit,
  zone color, and age.
- `resources/` — strings, launcher icon, and the App Settings
  (`settings/settings.xml` + `settings/properties.xml`) backing the
  fallback Athyx key. These only work with a Connect IQ Store install —
  see the note under "Install on your watch" for the sideload limitation.
