package lifeos.mobile

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object UsageCollector {
    private const val MIN_DURATION_MS = 1_000L

    fun collect(context: Context, since: Long, until: Long): List<ScreenEvent> {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = usm.queryEvents(since, until)

        val pm = context.packageManager
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }

        val result = ArrayList<ScreenEvent>()
        var currentPkg: String? = null
        var currentStart: Long = 0L
        var currentLabel: String = ""

        fun flush(end: Long) {
            val pkg = currentPkg ?: return
            val d = end - currentStart
            if (d >= MIN_DURATION_MS) {
                result.add(
                    ScreenEvent(
                        timestamp = iso.format(Date(currentStart)),
                        duration = (d / 1000L).toInt().coerceAtLeast(1),
                        app = currentLabel,
                        title = pkg,
                    )
                )
            }
            currentPkg = null
        }

        val e = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            when (e.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> {
                    flush(e.timeStamp)
                    currentPkg = e.packageName
                    currentStart = e.timeStamp
                    currentLabel = try {
                        pm.getApplicationInfo(e.packageName, 0).loadLabel(pm).toString()
                    } catch (_: PackageManager.NameNotFoundException) {
                        e.packageName
                    }
                }
                UsageEvents.Event.ACTIVITY_PAUSED -> flush(e.timeStamp)
            }
        }
        flush(until)

        return result
    }
}
