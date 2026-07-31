import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;

// Holds the last lactate reading pushed from the phone. A module acts as a
// singleton in Monkey C, so both the Application and the View read/write
// the same state without passing it around explicitly.
module LactateStore {
    var hasData as Boolean = false;
    var lactateMM as Float = 0.0f;
    var zone as Number = 0;
    var reportedAgeSec as Number = 0;
    var receivedAtMs as Number = 0;

    function update(data as Dictionary) as Void {
        // Values arrive from the phone as Object — Communications doesn't
        // preserve exact numeric type, so narrow with `as` before calling
        // any numeric conversion method.
        if (data.hasKey("lactate")) {
            var raw = data.get("lactate") as Number or Float or Long or Double or Null;
            if (raw != null) {
                lactateMM = raw.toFloat();
            }
        }
        if (data.hasKey("zone")) {
            var rawZone = data.get("zone") as Number or Float or Long or Double or Null;
            if (rawZone != null) {
                zone = rawZone.toNumber();
            }
        }
        if (data.hasKey("age")) {
            var rawAge = data.get("age") as Number or Float or Long or Double or Null;
            reportedAgeSec = rawAge != null ? rawAge.toNumber() : 0;
        }
        receivedAtMs = System.getTimer();
        hasData = true;
        WatchUi.requestUpdate();
    }

    // Age in seconds, accounting for time elapsed on the watch since the
    // message arrived (the phone's reported age is already stale by the
    // time Bluetooth delivery + this tick complete).
    function currentAgeSec() as Number {
        if (!hasData) {
            return -1;
        }
        var elapsedMs = System.getTimer() - receivedAtMs;
        return reportedAgeSec + (elapsedMs / 1000);
    }
}
