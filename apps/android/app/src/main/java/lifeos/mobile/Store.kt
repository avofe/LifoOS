package lifeos.mobile

import android.content.Context

object Store {
    private const val PREFS = "lifeos"
    private const val K_SERVER = "server"
    private const val K_TOKEN = "token"
    private const val K_DEVICE_ID = "device_id"
    private const val K_LAST_SYNC = "last_sync"

    fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun server(c: Context): String =
        prefs(c).getString(K_SERVER, null) ?: "http://138.124.74.151:4000"

    fun token(c: Context): String? = prefs(c).getString(K_TOKEN, null)
    fun deviceId(c: Context): String? = prefs(c).getString(K_DEVICE_ID, null)
    fun lastSync(c: Context): Long = prefs(c).getLong(K_LAST_SYNC, 0L)

    fun setServer(c: Context, v: String) =
        prefs(c).edit().putString(K_SERVER, v.trimEnd('/')).apply()

    fun setToken(c: Context, v: String) =
        prefs(c).edit().putString(K_TOKEN, v).apply()

    fun setDeviceId(c: Context, v: String) =
        prefs(c).edit().putString(K_DEVICE_ID, v).apply()

    fun setLastSync(c: Context, v: Long) =
        prefs(c).edit().putLong(K_LAST_SYNC, v).apply()
}
