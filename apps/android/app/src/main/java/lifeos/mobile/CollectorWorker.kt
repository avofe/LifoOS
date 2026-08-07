package lifeos.mobile

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class CollectorWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val token = Store.token(ctx)
        if (token.isNullOrEmpty()) return Result.success()

        return try {
            val server = Store.server(ctx)
            val now = System.currentTimeMillis()
            var since = Store.lastSync(ctx)
            if (since <= 0L) since = now - 24L * 3600_000L

            val events = UsageCollector.collect(ctx, since, now)
            if (events.isEmpty()) {
                Store.setLastSync(ctx, now)
                Result.success()
            } else {
                DeviceApi.sendEvents(server, token, events)
                Store.setLastSync(ctx, now)
                Result.success()
            }
        } catch (_: Throwable) {
            Result.retry()
        }
    }
}
