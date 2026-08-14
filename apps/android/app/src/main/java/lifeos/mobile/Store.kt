package lifeos.mobile

import android.content.Context

object Store {
    private const val PREFS = "lifeos"
    private const val K_SERVER = "server"
    private const val K_TOKEN = "token"
    private const val K_DEVICE_ID = "device_id"
    private const val K_LAST_SYNC = "last_sync"
    private const val K_LAST_SYNC_TIME = "last_sync_time"
    private const val K_LAST_ERROR = "last_error"
    private const val K_ACCESS_KEY = "access_key"
    private const val K_LAST_APP_PKG = "last_app_pkg"
    private const val K_LAST_APP_LABEL = "last_app_label"
    private const val K_LAST_APP_START = "last_app_start"

    fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun server(c: Context): String =
        prefs(c).getString(K_SERVER, null) ?: "http://138.124.74.151:4000"

    fun token(c: Context): String? = prefs(c).getString(K_TOKEN, null)
    fun deviceId(c: Context): String? = prefs(c).getString(K_DEVICE_ID, null)
    fun accessKey(c: Context): String? = prefs(c).getString(K_ACCESS_KEY, null)
    fun lastSync(c: Context): Long = prefs(c).getLong(K_LAST_SYNC, 0L)
    fun lastSyncTime(c: Context): Long = prefs(c).getLong(K_LAST_SYNC_TIME, 0L)
    fun lastError(c: Context): String? = prefs(c).getString(K_LAST_ERROR, null)

    fun lastAppPkg(c: Context): String? = prefs(c).getString(K_LAST_APP_PKG, null)
    fun lastAppLabel(c: Context): String? = prefs(c).getString(K_LAST_APP_LABEL, null)
    fun lastAppStart(c: Context): Long = prefs(c).getLong(K_LAST_APP_START, 0L)

    fun setServer(c: Context, v: String) =
        prefs(c).edit().putString(K_SERVER, v.trimEnd('/')).apply()

    fun setToken(c: Context, v: String) =
        prefs(c).edit().putString(K_TOKEN, v).apply()

    fun setDeviceId(c: Context, v: String) =
        prefs(c).edit().putString(K_DEVICE_ID, v).apply()

    fun setAccessKey(c: Context, v: String) =
        prefs(c).edit().putString(K_ACCESS_KEY, v).apply()

    fun setLastSync(c: Context, v: Long) =
        prefs(c).edit().putLong(K_LAST_SYNC, v).apply()

    fun setLastSyncTime(c: Context, v: Long) =
        prefs(c).edit().putLong(K_LAST_SYNC_TIME, v).apply()

    fun setLastError(c: Context, v: String?) =
        prefs(c).edit().putString(K_LAST_ERROR, v).apply()

    fun setLastApp(c: Context, pkg: String?, label: String, start: Long) =
        prefs(c).edit()
            .putString(K_LAST_APP_PKG, pkg)
            .putString(K_LAST_APP_LABEL, label)
            .putLong(K_LAST_APP_START, start)
            .apply()
}
