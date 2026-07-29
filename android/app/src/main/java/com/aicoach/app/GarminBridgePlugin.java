package com.aicoach.app;

import android.util.Log;

import com.garmin.android.connectiq.ConnectIQ;
import com.garmin.android.connectiq.IQApp;
import com.garmin.android.connectiq.IQDevice;
import com.garmin.android.connectiq.exception.InvalidStateException;
import com.garmin.android.connectiq.exception.ServiceUnavailableException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Bridges lactate readings from the web app to the Garmin watch app over the
 * Connect IQ Mobile SDK. The SDK talks to the Garmin Connect Mobile app
 * (must be installed and paired with the watch), which relays messages to
 * the watch over Bluetooth — this plugin never touches Bluetooth directly.
 *
 * Requires the Connect IQ Mobile SDK AAR to be placed in android/app/libs/
 * (see garmin-watch-app/README.md — Garmin does not publish it to Maven).
 */
@CapacitorPlugin(name = "GarminBridge")
public class GarminBridgePlugin extends Plugin {
    private static final String TAG = "GarminBridge";

    // Must match the <iq:application id="..."> UUID in garmin-watch-app/manifest.xml
    private static final String WATCH_APP_ID = "3f9a2b6e-6b7c-4c1a-9d0e-1a2b3c4d5e6f";

    private ConnectIQ connectIQ;
    private boolean sdkReady = false;

    private void ensureInitialized(Runnable onReady, Runnable onError) {
        if (sdkReady) {
            onReady.run();
            return;
        }
        connectIQ = ConnectIQ.getInstance(getContext(), ConnectIQ.IQConnectType.WIRELESS);
        connectIQ.initialize(getContext(), true, new ConnectIQ.ConnectIQListener() {
            @Override
            public void onSdkReady() {
                sdkReady = true;
                onReady.run();
            }

            @Override
            public void onInitializeError(ConnectIQ.IQSdkErrorStatus status) {
                Log.w(TAG, "Connect IQ init error: " + status);
                sdkReady = false;
                onError.run();
            }

            @Override
            public void onSdkShutDown() {
                sdkReady = false;
            }
        });
    }

    // getKnownDevices() returns every device paired via Garmin Connect Mobile,
    // whether or not it's currently in Bluetooth range — filter by status to
    // only target devices we can actually reach right now.
    private List<IQDevice> connectedDevices() {
        try {
            List<IQDevice> known = connectIQ.getKnownDevices();
            if (known == null) return null;
            List<IQDevice> connected = new java.util.ArrayList<>();
            for (IQDevice device : known) {
                if (device.getStatus() == IQDevice.IQDeviceStatus.CONNECTED) {
                    connected.add(device);
                }
            }
            return connected;
        } catch (InvalidStateException e) {
            Log.w(TAG, "getKnownDevices failed", e);
            return null;
        }
    }

    @PluginMethod
    public void isWatchAvailable(PluginCall call) {
        ensureInitialized(
            () -> {
                List<IQDevice> devices = connectedDevices();
                JSObject ret = new JSObject();
                ret.put("available", devices != null && !devices.isEmpty());
                call.resolve(ret);
            },
            () -> {
                JSObject ret = new JSObject();
                ret.put("available", false);
                call.resolve(ret);
            }
        );
    }

    @PluginMethod
    public void sendLactate(PluginCall call) {
        Double lactateMM = call.getDouble("lactateMM");
        Integer zone = call.getInt("zone");
        Integer ageSeconds = call.getInt("ageSeconds");
        Double timestamp = call.getDouble("timestamp");

        if (lactateMM == null) {
            call.reject("lactateMM is required");
            return;
        }

        ensureInitialized(
            () -> {
                List<IQDevice> devices = connectedDevices();
                if (devices == null || devices.isEmpty()) {
                    JSObject ret = new JSObject();
                    ret.put("sent", false);
                    ret.put("error", "no Garmin device connected");
                    call.resolve(ret);
                    return;
                }

                Map<String, Object> message = new HashMap<>();
                message.put("lactate", lactateMM);
                message.put("zone", zone != null ? zone : 0);
                message.put("age", ageSeconds != null ? ageSeconds : 0);
                message.put("ts", timestamp != null ? timestamp : 0);

                IQApp app = new IQApp(WATCH_APP_ID);
                boolean anySent = false;
                String lastError = null;

                for (IQDevice device : devices) {
                    try {
                        connectIQ.sendMessage(device, app, message, (dev, iqApp, status) -> {
                            if (status != ConnectIQ.IQMessageStatus.SUCCESS) {
                                Log.w(TAG, "sendMessage status: " + status + " for " + dev.getFriendlyName());
                            }
                        });
                        anySent = true;
                    } catch (InvalidStateException | ServiceUnavailableException e) {
                        lastError = e.getMessage();
                        Log.w(TAG, "sendMessage failed", e);
                    }
                }

                JSObject ret = new JSObject();
                ret.put("sent", anySent);
                if (!anySent && lastError != null) ret.put("error", lastError);
                call.resolve(ret);
            },
            () -> {
                JSObject ret = new JSObject();
                ret.put("sent", false);
                ret.put("error", "Connect IQ SDK not available (Garmin Connect Mobile app not installed?)");
                call.resolve(ret);
            }
        );
    }
}
