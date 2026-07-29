import Toybox.WatchUi;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Timer;

class LactateView extends WatchUi.View {
    var refreshTimer as Timer.Timer?;

    // Anything past this age is shown as stale rather than acted on as
    // fresh — the Athyx API is polled every ~30s, so this gives a couple
    // of missed cycles of slack before flagging it.
    const STALE_AFTER_SEC = 120;

    function initialize() {
        View.initialize();
    }

    function onShow() as Void {
        refreshTimer = new Timer.Timer();
        refreshTimer.start(method(:onTimerTick), 1000, true);
    }

    function onHide() as Void {
        if (refreshTimer != null) {
            refreshTimer.stop();
            refreshTimer = null;
        }
    }

    function onTimerTick() as Void {
        WatchUi.requestUpdate();
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
                Graphics.FONT_MEDIUM,
                WatchUi.loadResource(Rez.Strings.Waiting) as String,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER
            );
            return;
        }

        var age = LactateStore.currentAgeSec();
        var stale = age > STALE_AFTER_SEC;

        dc.setColor(stale ? Graphics.COLOR_DK_GRAY : zoneColorFor(LactateStore.zone), bg);
        dc.drawText(
            cx, cy - 25,
            Graphics.FONT_NUMBER_HOT,
            LactateStore.lactateMM.format("%.1f"),
            Graphics.TEXT_JUSTIFY_CENTER
        );

        dc.setColor(Graphics.COLOR_LT_GRAY, bg);
        dc.drawText(cx, cy + 28, Graphics.FONT_TINY, "ммоль/л", Graphics.TEXT_JUSTIFY_CENTER);

        dc.setColor(stale ? Graphics.COLOR_ORANGE : Graphics.COLOR_LT_GRAY, bg);
        dc.drawText(cx, cy + 55, Graphics.FONT_XTINY, formatAge(age), Graphics.TEXT_JUSTIFY_CENTER);
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
            return age.format("%d") + " сек назад";
        }
        return (age / 60).format("%d") + " мин назад";
    }
}
