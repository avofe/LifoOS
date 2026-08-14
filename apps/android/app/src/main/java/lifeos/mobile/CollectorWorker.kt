package lifeos.mobile

import android.app.AppOpsManager
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

            if (!hasUsageAccess(ctx)) {
                Store.setLastError(ctx, "Нет доступа к использованию приложений")
                return Result.success()
            }

            val carryOver = Store.lastAppPkg(ctx)?.let { pkg ->
                CarryOver(pkg, Store.lastAppLabel(ctx) ?: pkg, Store.lastAppStart(ctx))
            }
            val collectResult = UsageCollector.collect(ctx, since, now, carryOver)
            val events = collectResult.events
            if (events.isEmpty()) {
                Store.setLastSync(ctx, now)
                Store.setLastSyncTime(ctx, now)
                Store.setLastError(ctx, null)
                saveCarryOver(ctx, collectResult.carryOver)
                fetchAndShowNotifications(ctx, server, token)
                Result.success()
            } else {
                var received: Int
                try {
                    received = DeviceApi.sendEvents(server, token, events)
                } catch (e: ApiException) {
                    if (e.code == 401) {
                        reRegister(ctx, server)?.let { fresh ->
                            Store.setToken(ctx, fresh.token)
                            received = DeviceApi.sendEvents(server, fresh.token, events)
                        } ?: run {
                            Store.setLastError(ctx, "401: перерегистрация не удалась")
                            return Result.success()
                        }
                    } else {
                        throw e
                    }
                }
                Store.setLastSync(ctx, now)
                Store.setLastSyncTime(ctx, now)
                Store.setLastError(ctx, null)
                saveCarryOver(ctx, collectResult.carryOver)
                fetchAndShowNotifications(ctx, server, Store.token(ctx) ?: token)
                Result.success()
            }
        } catch (e: Throwable) {
            Store.setLastError(ctx, e.message ?: e.javaClass.simpleName)
            Result.retry()
        }
    }

    private fun fetchAndShowNotifications(ctx: Context, server: String, token: String) {
        try {
            val items = DeviceApi.fetchNotifications(server, token)
            Notifier.initChannels(ctx)
            Notifier.showNew(ctx, items)
        } catch (_: Throwable) {
            // notification fetch must not break the collector
        }
    }

    private fun saveCarryOver(ctx: Context, carryOver: CarryOver?) {
        if (carryOver != null) {
            Store.setLastApp(ctx, carryOver.pkg, carryOver.label, carryOver.startMs)
        } else {
            Store.setLastApp(ctx, null, "", 0L)
        }
    }

    private fun hasUsageAccess(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        return try {
            val mode = appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
            mode == AppOpsManager.MODE_ALLOWED
        } catch (_: Throwable) {
            false
        }
    }

    private fun reRegister(ctx: Context, server: String): RegisterResult? {
        val key = Store.accessKey(ctx)
        if (key.isNullOrEmpty()) return null
        return try {
            DeviceApi.register(server, BuildHelper.deviceName(), key)
        } catch (_: Throwable) {
            null
        }
    }
}

object BuildHelper {
    fun deviceName(): String =
        "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}".trim()
}
