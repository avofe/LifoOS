package lifeos.mobile

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import lifeos.mobile.databinding.ActivityMainBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.server.setText(Store.server(this))
        Notifier.initChannels(this)
        refreshStatus()
        requestNotificationPermission()

        binding.grant.setOnClickListener { openUsageAccessSettings() }

        binding.syncNow.setOnClickListener { runSyncNow() }

        binding.connect.setOnClickListener {
            val server = binding.server.text.toString().trim()
            val key = binding.key.text.toString().trim()
            if (server.isEmpty() || key.isEmpty()) {
                toast("Введи адрес сервера и Access Key")
                return@setOnClickListener
            }
            binding.connect.isEnabled = false
            lifecycleScope.launch {
                try {
                    val name = deviceName()
                    val result = withContext(Dispatchers.IO) {
                        DeviceApi.register(server, name, key)
                    }
                    Store.setServer(this@MainActivity, server)
                    Store.setToken(this@MainActivity, result.token)
                    Store.setDeviceId(this@MainActivity, result.id)
                    Store.setAccessKey(this@MainActivity, key)
                    Store.setLastSync(this@MainActivity, 0L)
                    scheduleWork()
                    toast("Устройство «${result.name}» подключено")
                } catch (t: Throwable) {
                    toast("Ошибка: ${t.message}")
                } finally {
                    binding.connect.isEnabled = true
                    refreshStatus()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    private fun deviceName(): String =
        "${Build.MANUFACTURER} ${Build.MODEL}".trim()

    private fun refreshStatus() {
        val token = Store.token(this)
        binding.deviceName.text = deviceName()
        binding.status.text = if (token.isNullOrEmpty()) {
            "Устройство не подключено — введи Access Key и нажми «Подключить»"
        } else {
            "Подключено (id=${Store.deviceId(this) ?: "?"}). Сбор каждые 15 минут."
        }
        binding.usageAccessNote.text = if (hasUsageAccess()) {
            "Доступ к использованию приложений: выдан"
        } else {
            "Выдай доступ к использованию приложений, иначе не будет данных"
        }

        val lastSync = Store.lastSyncTime(this)
        val syncText = if (lastSync > 0L) {
            "Последняя синхронизация: ${fmtTime(lastSync)}"
        } else {
            "Синхронизации ещё не было"
        }
        val err = Store.lastError(this)
        binding.lastSync.text = syncText + if (err.isNullOrEmpty()) "" else "\nПоследняя ошибка: $err"

        if (!token.isNullOrEmpty()) scheduleWork()
    }

    private fun runSyncNow() {
        if (Store.token(this).isNullOrEmpty()) {
            toast("Сначала подключи устройство")
            return
        }
        val work = OneTimeWorkRequestBuilder<CollectorWorker>().build()
        WorkManager.getInstance(this).enqueue(work)
        toast("Синхронизация запущена — проверь статус через пару секунд")
        binding.lastSync.postDelayed({ refreshStatus() }, 3000)
    }

    private fun hasUsageAccess(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val appOps = getSystemService(AppOpsManager::class.java)
            val mode = appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                packageName
            )
            if (mode == AppOpsManager.MODE_ALLOWED) return true
            if (mode == AppOpsManager.MODE_DEFAULT) {
                return checkSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) ==
                    PackageManager.PERMISSION_GRANTED
            }
            return false
        }
        return try {
            val usm = getSystemService(UsageStatsManager::class.java)
            val info = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, 0, 1)
            info != null && info.isNotEmpty()
        } catch (_: Throwable) {
            false
        }
    }

    private fun fmtTime(ms: Long): String =
        SimpleDateFormat("dd.MM HH:mm", Locale.getDefault()).format(Date(ms))

    private fun scheduleWork() {
        val periodic = PeriodicWorkRequestBuilder<CollectorWorker>(15, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "lifeos-collector",
            ExistingPeriodicWorkPolicy.KEEP,
            periodic,
        )
    }

    private fun openUsageAccessSettings() {
        try {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        } catch (_: Exception) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("package:$packageName")))
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 1)
            }
        }
    }

    private fun toast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
