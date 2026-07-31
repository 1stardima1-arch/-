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

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Bridges lactate readings from the web app to the Garmin watch app over the
 * Connect IQ Mobile SDK. The SDK talks to the Garmin Connect Mobile app
 * (must be installed and paired with the watch), which relays messages to
 * the watch over Bluetooth — this plugin never touches Bluetooth directly.
 *
 * The SDK itself (com.garmin.connectiq:ciq-companion-app-sdk) is resolved
 * from Maven Central via android/app/build.gradle — no manual download.
 */
@CapacitorPlugin(name = "GarminBridge")
public class GarminBridgePlugin extends Plugin {
    private static final String TAG = "GarminBridge";

    // Must match the <iq:application id="..."> UUID in garmin-watch-app/manifest.xml
    private static final String WATCH_APP_ID = "3f9a2b6e-6b7c-4c1a-9d0e-1a2b3c4d5e6f";

    // GET /v1/sessions?limit=1 per athyx.com/developers — read-only, Bearer
    // API key. Done natively (not a browser fetch()) so it isn't subject to
    // CORS, since the API is documented for "your own dashboards/scripts"
    // rather than arbitrary browser origins.
    private static final String ATHYX_API_BASE = "https://api.athyx.com/v1";

    private ConnectIQ connectIQ;
    private boolean sdkReady = false;
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();

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
        } catch (InvalidStateException | ServiceUnavailableException e) {
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

    // Tests/reads the Athyx key by fetching the most recent session. Used
    // both to verify a freshly-pasted key and, on a JS-side interval, to
    // poll for a new reading to relay to the watch — same endpoint either way.
    @PluginMethod
    public void fetchAthyxLatest(PluginCall call) {
        String apiKey = call.getString("apiKey");
        if (apiKey == null || apiKey.isEmpty()) {
            call.reject("apiKey is required");
            return;
        }

        networkExecutor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(ATHYX_API_BASE + "/sessions?limit=1");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + apiKey);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                int status = conn.getResponseCode();
                if (status == 401) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "invalid_key");
                    call.resolve(ret);
                    return;
                }
                if (status < 200 || status >= 300) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("error", "http_" + status);
                    call.resolve(ret);
                    return;
                }

                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                String body = sb.toString().trim();
                JSONArray sessions;
                if (body.startsWith("[")) {
                    sessions = new JSONArray(body);
                } else {
                    JSONObject obj = new JSONObject(body);
                    JSONArray fromSessions = obj.optJSONArray("sessions");
                    JSONArray fromData = obj.optJSONArray("data");
                    sessions = fromSessions != null ? fromSessions : (fromData != null ? fromData : new JSONArray());
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                if (sessions.length() == 0) {
                    ret.put("hasReading", false);
                    call.resolve(ret);
                    return;
                }

                JSONObject session = sessions.getJSONObject(0);
                Double lactate = firstNumber(session, "avg_lactate_mM", "avgLactateMM");
                Double peak = firstNumber(session, "peak_lactate_mM", "peakLactateMM");
                Double hr = firstNumber(session, "avg_hr", "avgHR");
                String startedAt = firstString(session, "started_at", "startedAt", "date", "created_at");

                ret.put("hasReading", lactate != null);
                if (lactate != null) ret.put("lactateMM", lactate);
                if (peak != null) ret.put("peakLactateMM", peak);
                if (hr != null) ret.put("avgHR", hr);
                if (startedAt != null) ret.put("startedAt", startedAt);
                call.resolve(ret);
            } catch (Exception e) {
                Log.w(TAG, "fetchAthyxLatest failed", e);
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("error", e.getMessage() != null ? e.getMessage() : "network_error");
                call.resolve(ret);
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }

    private Double firstNumber(JSONObject obj, String... keys) {
        for (String k : keys) {
            if (obj.has(k) && !obj.isNull(k)) {
                try {
                    return obj.getDouble(k);
                } catch (Exception ignored) {
                    // fall through to next key
                }
            }
        }
        return null;
    }

    private String firstString(JSONObject obj, String... keys) {
        for (String k : keys) {
            if (obj.has(k) && !obj.isNull(k)) {
                String v = obj.optString(k, null);
                if (v != null) return v;
            }
        }
        return null;
    }
}
