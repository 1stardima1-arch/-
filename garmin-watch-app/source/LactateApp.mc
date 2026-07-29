import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;
import Toybox.Communications;

class LactateApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary?) as Void {
        Communications.registerForPhoneAppMessages(method(:onPhoneMessage));
    }

    function onStop(state as Dictionary?) as Void {
        Communications.registerForPhoneAppMessages(null);
    }

    // Called with a Communications.PhoneAppMessage whose .data is whatever
    // the phone sent — a Dictionary with lactate/zone/age/ts keys, see
    // GarminBridgePlugin.sendLactate on the Android side.
    function onPhoneMessage(msg as Communications.PhoneAppMessage) as Void {
        var data = msg.data;
        if (data instanceof Dictionary) {
            LactateStore.update(data as Dictionary);
        }
    }

    function getInitialView() as Array<WatchUi.Views or WatchUi.InputDelegates>? {
        return [ new LactateView(), new LactateDelegate() ];
    }
}

function getApp() as LactateApp {
    return Application.getApp() as LactateApp;
}
