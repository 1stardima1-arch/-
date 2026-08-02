import Toybox.Application;
import Toybox.Background;
import Toybox.Lang;
import Toybox.System;
import Toybox.WatchUi;
import Toybox.Time;

class LactateApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    // Garmin enforces a 5-minute floor on background events for Data Field
    // apps, so that's the fastest Lactate can ever refresh — see
    // LactateServiceDelegate for the actual Athyx polling.
    function onStart(state as Dictionary?) as Void {
        Background.registerForTemporalEvent(new Time.Duration(300));
    }

    // Data Field apps can't touch Communications from the foreground — it
    // compiles and can even appear to work in the simulator, but crashes
    // real hardware. All Athyx polling has to happen in a background
    // service instead.
    function getServiceDelegate() as [System.ServiceDelegate] {
        return [ new LactateServiceDelegate() ];
    }

    // Called on the foreground process when the background service hands
    // off a fresh reading via Background.exit(). Background and foreground
    // run in separate memory spaces, so this callback — not a shared
    // module variable — is how the reading crosses over.
    // No explicit parameter type here — the base class declares a wider
    // union (Application.PropertyValueType) than "Dictionary or Null" and
    // the compiler rejects a narrower override, so let it infer instead.
    function onBackgroundData(data) as Void {
        if (data instanceof Dictionary) {
            LactateStore.update(data as Dictionary);
        }
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [ new LactateView() ] as [Views];
    }
}

function getApp() as LactateApp {
    return Application.getApp() as LactateApp;
}
