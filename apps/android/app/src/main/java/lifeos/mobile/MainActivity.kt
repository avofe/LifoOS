package lifeos.mobile

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
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
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.server.setText(Store.server(this))
        refreshStatus()

        binding.grant.setOnClickListener { openUsageAccessSettings() }

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
        if (!token.isNullOrEmpty()) scheduleWork()
    }

    private fun hasUsageAccess(): Boolean {
        val usm = getSystemService(android.app.usage.UsageStatsManager::class.java)
        val info = usm.queryUsageStats(android.app.usage.UsageStatsManager.INTERVAL_DAILY, 0, 1)
        return info != null && info.isNotEmpty()
    }

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

    private fun toast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
