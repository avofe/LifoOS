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

        val segments = HashMap<String, Long>()
        val e = UsageEvents.Event()
        var currentPkg: String? = null
        var currentStart: Long = 0L

        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            when (e.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> {
                    closeSegment(segments, currentPkg, currentStart, e.timeStamp)
                    currentPkg = e.packageName
                    currentStart = e.timeStamp
                }
                UsageEvents.Event.ACTIVITY_PAUSED -> {
                    closeSegment(segments, currentPkg, currentStart, e.timeStamp)
                    currentPkg = null
                }
            }
        }
        closeSegment(segments, currentPkg, currentStart, until)

        val pm = context.packageManager
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
        val ts = iso.format(Date(until))

        return segments.entries
            .filter { it.value >= MIN_DURATION_MS }
            .map { (pkg, ms) ->
                val label = try {
                    pm.getApplicationInfo(pkg, 0).loadLabel(pm).toString()
                } catch (_: PackageManager.NameNotFoundException) {
                    pkg
                }
                ScreenEvent(
                    timestamp = ts,
                    duration = (ms / 1000L).toInt().coerceAtLeast(1),
                    app = label,
                    title = pkg,
                )
            }
    }

    private fun closeSegment(
        segments: MutableMap<String, Long>,
        pkg: String?,
        start: Long,
        end: Long,
    ) {
        if (pkg == null) return
        val d = end - start
        if (d > 0) segments[pkg] = segments.getOrDefault(pkg, 0L) + d
    }
}
