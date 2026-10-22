package com.ezlex.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/** An error with a message that is safe to show to the user. */
class ApiException(message: String, val code: String? = null, val status: Int = 0) : Exception(message)

object Http {
    private val JSON = "application/json; charset=utf-8".toMediaType()

    // Court searches load ~17 sections, AI calls can take a while
    val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    suspend fun get(url: String, headers: Map<String, String> = emptyMap()): JSONObject =
        call(Request.Builder().url(url).get(), headers)

    suspend fun post(url: String, body: JSONObject, headers: Map<String, String> = emptyMap()): JSONObject =
        call(Request.Builder().url(url).post(body.toString().toRequestBody(JSON)), headers)

    suspend fun getArray(url: String, headers: Map<String, String> = emptyMap()): JSONArray = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url).get().apply { headers.forEach { (k, v) -> header(k, v) } }.build()
        try {
            client.newCall(req).execute().use { res ->
                val text = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiException("Request failed (${res.code}).", status = res.code)
                JSONArray(text.ifBlank { "[]" })
            }
        } catch (e: IOException) {
            throw ApiException(NETWORK_ERROR)
        }
    }

    private suspend fun call(builder: Request.Builder, headers: Map<String, String>): JSONObject = withContext(Dispatchers.IO) {
        headers.forEach { (k, v) -> builder.header(k, v) }
        try {
            client.newCall(builder.build()).execute().use { res ->
                val text = res.body?.string().orEmpty()
                val json = runCatching { JSONObject(text) }.getOrElse { JSONObject() }
                if (!res.isSuccessful) {
                    val msg = json.optString("error").ifBlank {
                        json.optString("error_description").ifBlank { json.optString("msg").ifBlank { "Something went wrong (${res.code})." } }
                    }
                    throw ApiException(msg, json.optString("code").ifBlank { null }, res.code)
                }
                json
            }
        } catch (e: IOException) {
            throw ApiException(NETWORK_ERROR)
        }
    }

    const val NETWORK_ERROR = "Can't reach the EzLex server. Check your internet connection and try again."
}

fun jsonOf(vararg pairs: Pair<String, Any?>): JSONObject = JSONObject().apply {
    pairs.forEach { (k, v) -> if (v != null) put(k, v) }
}

fun JSONObject.str(key: String): String = if (isNull(key)) "" else optString(key)
