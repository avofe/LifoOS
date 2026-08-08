package lifeos.mobile

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class RegisterResult(val id: String, val name: String, val token: String)

data class ScreenEvent(
    val timestamp: String,
    val duration: Int,
    val app: String,
    val title: String?,
)

class ApiException(val code: Int, message: String) : IOException(message)

object DeviceApi {
    private val json = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    fun register(server: String, deviceName: String, accessKey: String): RegisterResult {
        val body = JSONObject()
            .put("name", deviceName)
            .put("type", "mobile")
            .toString()
            .toRequestBody(json)

        val req = Request.Builder()
            .url("$server/api/devices/register")
            .post(body)
            .header("x-api-key", accessKey)
            .build()

        client.newCall(req).execute().use { resp ->
            val text = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) throw ApiException(resp.code, "HTTP ${resp.code}: ${text.take(200)}")
            val j = JSONObject(text)
            return RegisterResult(j.getString("id"), j.getString("name"), j.getString("token"))
        }
    }

    fun sendEvents(server: String, token: String, events: List<ScreenEvent>): Int {
        val arr = JSONArray()
        for (e in events) {
            val o = JSONObject()
                .put("timestamp", e.timestamp)
                .put("duration", e.duration)
                .put("app", e.app)
            if (e.title != null) o.put("title", e.title)
            arr.put(o)
        }
        val body = JSONObject().put("events", arr).toString().toRequestBody(json)

        val req = Request.Builder()
            .url("$server/api/screentime/events")
            .post(body)
            .header("x-device-token", token)
            .build()

        client.newCall(req).execute().use { resp ->
            val text = resp.body?.string().orEmpty()
            if (resp.code == 401) throw ApiException(401, "Invalid device token: ${text.take(200)}")
            if (!resp.isSuccessful) throw ApiException(resp.code, "HTTP ${resp.code}: ${text.take(200)}")
            return JSONObject(text).getInt("received")
        }
    }

    fun fetchNotifications(server: String, token: String): List<AppNotification> {
        val req = Request.Builder()
            .url("$server/api/notifications/pending")
            .get()
            .header("x-device-token", token)
            .build()

        client.newCall(req).execute().use { resp ->
            val text = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) throw ApiException(resp.code, "HTTP ${resp.code}: ${text.take(200)}")
            val arr = JSONArray(text)
            return (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                AppNotification(
                    id = o.getString("id"),
                    channel = o.optString("channel", "limits"),
                    title = o.getString("title"),
                    body = o.getString("body"),
                )
            }
        }
    }
}
