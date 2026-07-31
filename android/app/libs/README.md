# Connect IQ Mobile SDK

`GarminBridgePlugin.java` uses Garmin's Connect IQ Mobile SDK for Android.
It's published on Maven Central as `com.garmin.connectiq:ciq-companion-app-sdk`
and declared as a normal dependency in `android/app/build.gradle` — Gradle
resolves it automatically at build time, no manual download needed.

This `libs/` folder itself is just Capacitor's default local-jar directory
(referenced by `android/app/build.gradle`'s `fileTree(dir: 'libs')`); it's
fine for it to stay empty.
