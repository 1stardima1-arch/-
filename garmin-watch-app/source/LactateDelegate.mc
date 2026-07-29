import Toybox.WatchUi;
import Toybox.Lang;

class LactateDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() as Boolean {
        WatchUi.requestUpdate();
        return true;
    }
}
