package lifeos.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

data class AppNotification(
    val id: String,
    val channel: String,
    val title: String,
    val body: String,
)

object Notifier {
    private const val PREFS = "lifeos_notifications"
    private const val SHOWN = "shown_ids"

    fun initChannels(context: Context) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channels = listOf(
            NotificationChannel("limits", "Лимиты экрана", NotificationManager.IMPORTANCE_LOW).apply {
                setSound(null, null)
                enableVibration(false)
            },
            NotificationChannel("summary", "Сводка дня", NotificationManager.IMPORTANCE_LOW).apply {
                setSound(null, null)
                enableVibration(false)
            },
        )
        nm.createNotificationChannels(channels)
    }

    fun showNew(context: Context, items: List<AppNotification>) {
        if (items.isEmpty()) return
        if (!hasPermission(context)) return

        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val shown = prefs.getStringSet(SHOWN, emptySet())?.toMutableSet() ?: mutableSetOf()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        var changed = false

        for (n in items) {
            if (n.id in shown) continue

            val pending = PendingIntent.getActivity(
                context,
                n.id.hashCode(),
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            val notification: Notification = NotificationCompat.Builder(context, n.channel)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(n.title)
                .setContentText(n.body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(n.body))
                .setContentIntent(pending)
                .setAutoCancel(true)
                .build()

            try {
                nm.notify(n.id.hashCode(), notification)
                shown.add(n.id)
                changed = true
            } catch (_: SecurityException) {
                return
            }
        }

        if (changed) {
            prefs.edit().putStringSet(SHOWN, shown).apply()
        }
    }

    fun clearShown(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(SHOWN).apply()
    }

    private fun hasPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
        }
        return true
    }
}
