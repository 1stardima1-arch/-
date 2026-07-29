# Connect IQ Mobile SDK

`GarminBridgePlugin.java` needs Garmin's Connect IQ Mobile SDK for Android,
which Garmin does not publish to Maven — you have to download it yourself:

1. Sign in at https://developer.garmin.com/connect-iq/connect-iq-basics/getting-started-mobile-sdk/
   and download the Connect IQ Mobile SDK for Android.
2. Copy the AAR file into this directory and rename it to:
   ```
   android/app/libs/connectiq-android-lib.aar
   ```
   (the exact filename `build.gradle` references via `implementation(name:
   'connectiq-android-lib', ext: 'aar')`).

Until this file is present, any build that compiles `GarminBridgePlugin.java`
will fail with "cannot find symbol" for `com.garmin.android.connectiq.*` —
that's expected, not a bug. See `../../../garmin-watch-app/README.md` for
the rest of the setup.
