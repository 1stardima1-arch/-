import Toybox.WatchUi;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Activity;
import Toybox.Time;

// A Data Field, not a standalone app — added to an activity's data screens
// (Running, Roller Skiing, XC Skiing, ...) alongside pace/HR/etc, instead of
// being launched on its own from the Activities/Apps list.
class LactateView extends WatchUi.DataField {
    // Anything past this age is shown as stale rather than acted on as
    // fresh. Garmin's background-event floor means Lactate itself only
    // polls Athyx every 5 min, so this leaves a little slack past that
    // before flagging it grey.
    const STALE_AFTER_SEC = 360;

    function initialize() {
        DataField.initialize();
    }

    // The value comes from LactateStore (pushed by the phone over
    // Communications), not from `info` or this return value — onUpdate()
    // below draws straight from the store. This still has to satisfy
    // DataField's compute() signature to compile.
    function compute(info as Activity.Info) as Numeric or Duration or String or Null {
        return null;
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        var bg = Graphics.COLOR_BLACK;
        dc.setColor(Graphics.COLOR_WHITE, bg);
        dc.clear();

        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var cy = h / 2;

        if (!LactateStore.hasData) {
            dc.drawText(
                cx, cy,
                Graphics.FONT_TINY,
                WatchUi.loadResource(Rez.Strings.Waiting) as String,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER
            );
            return;
        }

        var age = LactateStore.currentAgeSec();
        var stale = age > STALE_AFTER_SEC;

        dc.setColor(stale ? Graphics.COLOR_DK_GRAY : zoneColorFor(LactateStore.zone), bg);
        dc.drawText(
            cx, cy - (h / 8),
            Graphics.FONT_NUMBER_MEDIUM,
            LactateStore.lactateMM.format("%.1f"),
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER
        );

        dc.setColor(stale ? Graphics.COLOR_ORANGE : Graphics.COLOR_LT_GRAY, bg);
        dc.drawText(
            cx, cy + (h / 3),
            Graphics.FONT_XTINY,
            formatAge(age),
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER
        );
    }

    function zoneColorFor(zone as Number) as Graphics.ColorValue {
        if (zone <= 1) {
            return Graphics.COLOR_GREEN;
        }
        if (zone == 2) {
            return Graphics.COLOR_YELLOW;
        }
        if (zone == 3) {
            return Graphics.COLOR_ORANGE;
        }
        return Graphics.COLOR_RED;
    }

    function formatAge(age as Number) as String {
        if (age < 60) {
            return age.format("%d") + " с";
        }
        return (age / 60).format("%d") + " м";
    }
}
