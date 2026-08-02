import Toybox.Background;
import Toybox.Communications;
import Toybox.Application;
import Toybox.Lang;
import Toybox.PersistedContent;
import Toybox.System;

// Runs in the background so it can poll Athyx on its own schedule —
// Data Field apps can only do Communications (including web requests) from
// a background service, never directly in the foreground app (see
// LactateApp). The API key comes from this app's Garmin Connect Mobile
// settings screen (Application.Properties), not from the phone app.
(:background)
class LactateServiceDelegate extends System.ServiceDelegate {
    function initialize() {
        System.ServiceDelegate.initialize();
    }

    function onTemporalEvent() as Void {
        var apiKey = Application.Properties.getValue("athyxApiKey");
        if (!(apiKey instanceof String) || apiKey.equals("")) {
            Background.exit(null);
            return;
        }

        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => {
                "Authorization" => "Bearer " + apiKey,
                "Accept" => "application/json",
            },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
        };

        Communications.makeWebRequest(
            "https://api.athyx.com/v1/sessions?limit=1",
            null,
            options,
            method(:onReceive)
        );
    }

    // Must match Communications.makeWebRequest's declared callback type
    // exactly (no Array in the union — omitting the annotation defaults to
    // Any, which the compiler also rejects here).
    function onReceive(responseCode as Number, data as Dictionary or String or PersistedContent.Iterator or Null) as Void {
        if (responseCode != 200 || data == null) {
            Background.exit(null);
            return;
        }

        var sessions = null;
        if (data instanceof Array) {
            sessions = data;
        } else if (data instanceof Dictionary) {
            sessions = data.get("sessions");
            if (sessions == null) {
                sessions = data.get("data");
            }
        }

        if (!(sessions instanceof Array) || sessions.size() == 0) {
            Background.exit(null);
            return;
        }

        var session = sessions[0];
        if (!(session instanceof Dictionary)) {
            Background.exit(null);
            return;
        }

        var lactate = firstNumber(session as Dictionary, ["avg_lactate_mM", "avgLactateMM"]);
        if (lactate == null) {
            Background.exit(null);
            return;
        }

        var zone = 4;
        if (lactate <= 2.0) {
            zone = 1;
        } else if (lactate <= 4.0) {
            zone = 2;
        } else if (lactate <= 6.0) {
            zone = 3;
        }

        Background.exit({
            "lactate" => lactate,
            "zone" => zone,
            "age" => 0,
        });
    }

    function firstNumber(dict as Dictionary, keys as Array<String>) as Float or Null {
        for (var i = 0; i < keys.size(); i += 1) {
            var v = dict.get(keys[i]);
            if (v instanceof Number || v instanceof Float || v instanceof Long || v instanceof Double) {
                return v.toFloat();
            }
        }
        return null;
    }
}
