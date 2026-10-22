package com.ezlex.app.data

import com.ezlex.app.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder

data class CaseType(val value: String, val label: String)
data class Captcha(val session: String, val imageDataUri: String)
data class CaseField(val label: String, val value: String)
data class CaseSection(val id: String, val title: String, val html: String, val failed: Boolean)
data class CaseResult(
    val found: Boolean,
    val status: String,
    val fields: List<CaseField>,
    val html: String,
    val sections: List<CaseSection>,
    val raw: JSONObject,
)
data class Activity(
    val id: String,
    val type: String,
    val title: String,
    val summary: String,
    val metadata: JSONObject,
    val createdAt: String,
)
data class PinInfo(val city: String, val state: String)

/**
 * Talks to the same EzLex Next.js API the website uses, plus Supabase Auth for
 * session tokens (anon key only — it is the public client key the website also ships).
 */
class Repository(private val store: SessionStore) {

    private suspend fun api(path: String) = store.apiUrl() + path
    private val supabaseHeaders = mapOf("apikey" to BuildConfig.SUPABASE_ANON_KEY)

    // ───────────────────────── Auth ─────────────────────────

    suspend fun loginWithPassword(email: String, password: String): Session {
        val d = Http.post(api("/api/auth/login"), jsonOf("email" to email.trim(), "password" to password))
        val session = d.optJSONObject("data")?.optJSONObject("session") ?: throw ApiException("Login failed. Please try again.")
        return saveSupabaseSession(session)
    }

    /** flow: "login" | "register" | "reset" */
    suspend fun sendEmailOtp(email: String, name: String = "User", flow: String) {
        Http.post(api("/api/auth/send_email_otp"), jsonOf("email" to email.trim(), "name" to name, "flow" to flow))
    }

    /** Verifies an emailed code. For sign-in, exchanges the returned magic-link hash for a session. */
    suspend fun verifyEmailOtp(email: String, otp: String, signIn: Boolean): Session? {
        val d = Http.post(api("/api/auth/verify_otp"), jsonOf("email" to email.trim(), "otp" to otp))
        if (!signIn) return null
        val hash = d.str("tokenHash").ifBlank { throw ApiException("Could not sign you in. Please use your password.") }
        val s = Http.post(
            "${BuildConfig.SUPABASE_URL}/auth/v1/verify",
            jsonOf("type" to "magiclink", "token_hash" to hash),
            supabaseHeaders,
        )
        return saveSupabaseSession(s)
    }

    suspend fun checkDuplicate(email: String, phone: String): String? {
        val d = Http.post(api("/api/auth/check_duplicate"), jsonOf("email" to email.trim(), "phone" to phone))
        return if (d.optBoolean("exists")) d.str("message").ifBlank { "An account already exists with these details." } else null
    }

    suspend fun register(fullName: String, email: String, phone: String, password: String, role: String, officialId: String) {
        Http.post(
            api("/api/auth/register"),
            jsonOf(
                "email" to email.trim(), "password" to password, "fullName" to fullName.trim(),
                "phone" to phone, "role" to role, "officialId" to officialId.ifBlank { null },
            ),
        )
    }

    suspend fun verifyResetCode(email: String, otp: String) {
        Http.post(api("/api/auth/reset_password"), jsonOf("email" to email.trim(), "otp" to otp))
    }

    suspend fun resetPassword(email: String, otp: String, newPassword: String) {
        Http.post(api("/api/auth/reset_password"), jsonOf("email" to email.trim(), "otp" to otp, "newPassword" to newPassword))
    }

    suspend fun deleteAccount() {
        Http.post(api("/api/auth/delete_account"), JSONObject(), authHeader())
        store.clear()
    }

    suspend fun logout() = store.clear()

    private suspend fun saveSupabaseSession(s: JSONObject): Session {
        val user = s.optJSONObject("user") ?: JSONObject()
        val meta = user.optJSONObject("user_metadata") ?: JSONObject()
        val expiresAt = s.optLong("expires_at").takeIf { it > 0 }
            ?: (System.currentTimeMillis() / 1000 + s.optLong("expires_in", 3600))
        var session = Session(
            accessToken = s.str("access_token"),
            refreshToken = s.str("refresh_token"),
            expiresAt = expiresAt,
            userId = user.str("id"),
            email = user.str("email"),
            fullName = meta.str("full_name"),
        )
        if (session.accessToken.isBlank()) throw ApiException("Sign-in failed. Please try again.")
        if (session.fullName.isBlank()) {
            session = session.copy(fullName = runCatching { fetchProfileName(session) }.getOrDefault(""))
        }
        store.save(session)
        return session
    }

    private suspend fun fetchProfileName(s: Session): String {
        val rows = Http.getArray(
            "${BuildConfig.SUPABASE_URL}/rest/v1/profiles?select=full_name&id=eq.${s.userId}",
            supabaseHeaders + ("Authorization" to "Bearer ${s.accessToken}"),
        )
        return rows.optJSONObject(0)?.str("full_name").orEmpty()
    }

    /** Returns a valid session, refreshing the access token when it is about to expire. */
    suspend fun validSession(): Session? {
        val s = store.current() ?: return null
        if (s.expiresAt - 60 > System.currentTimeMillis() / 1000) return s
        return try {
            val r = Http.post(
                "${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
                jsonOf("refresh_token" to s.refreshToken),
                supabaseHeaders,
            )
            saveSupabaseSession(r).let { it.copy(fullName = it.fullName.ifBlank { s.fullName }) }.also { store.save(it) }
        } catch (e: ApiException) {
            if (e.status in 400..499) { store.clear(); null } else s
        }
    }

    private suspend fun authHeader(): Map<String, String> {
        val s = validSession() ?: throw ApiException("Please sign in again.", status = 401)
        return mapOf("Authorization" to "Bearer ${s.accessToken}")
    }

    // ───────────────────────── AI ─────────────────────────

    suspend fun askRights(query: String, language: String): String =
        Http.post(api("/api/ai/rights"), jsonOf("query" to query, "language" to language)).str("response")

    /** messages: role "user" | "ai" */
    suspend fun draft(messages: List<Pair<String, String>>, documentType: String): String {
        val arr = JSONArray()
        messages.forEachIndexed { i, (role, content) ->
            arr.put(jsonOf("id" to "$i", "role" to role, "content" to content))
        }
        return Http.post(api("/api/ai/draft"), jsonOf("messages" to arr, "documentType" to documentType)).str("response")
    }

    suspend fun pincode(pin: String): PinInfo? = runCatching {
        val arr = Http.getArray("https://api.postalpincode.in/pincode/$pin")
        val po = arr.optJSONObject(0)?.optJSONArray("PostOffice")?.optJSONObject(0) ?: return null
        PinInfo(po.str("District"), po.str("State"))
    }.getOrNull()

    // ───────────────────────── High Court of Karnataka ─────────────────────────

    suspend fun caseTypes(): List<CaseType> {
        val arr = Http.get(api("/api/court/karnataka-hc?action=types")).optJSONArray("types") ?: return emptyList()
        return (0 until arr.length()).map { arr.getJSONObject(it).let { o -> CaseType(o.str("value"), o.str("label")) } }
    }

    suspend fun captcha(): Captcha {
        val d = Http.get(api("/api/court/karnataka-hc?action=captcha"))
        return Captcha(d.str("session"), d.str("image"))
    }

    suspend fun searchCase(c: Captcha, bench: String, type: String, no: String, year: String, captcha: String): CaseResult {
        val d = Http.post(
            api("/api/court/karnataka-hc"),
            jsonOf("session" to c.session, "bench" to bench, "caseType" to type, "caseNo" to no, "caseYear" to year, "captcha" to captcha),
        )
        return parseCase(d)
    }

    fun parseCase(d: JSONObject): CaseResult {
        val fields = d.optJSONArray("fields")?.let { a ->
            (0 until a.length()).map { a.getJSONObject(it).let { o -> CaseField(o.str("label"), o.str("value")) } }
        }.orEmpty()
        val sections = d.optJSONArray("sections")?.let { a ->
            (0 until a.length()).map { a.getJSONObject(it).let { o -> CaseSection(o.str("id"), o.str("title"), o.str("html"), o.optBoolean("failed")) } }
        }.orEmpty()
        return CaseResult(d.optBoolean("found"), d.str("status"), fields, d.str("html"), sections, d)
    }

    // ───────────────────────── Activity history ─────────────────────────

    /** Saves an activity for signed-in users; returns its id (or null for guests / on failure). */
    suspend fun logActivity(type: String, title: String, summary: String, metadata: JSONObject, activityId: String? = null): String? {
        if (store.current() == null) return null
        return runCatching {
            Http.post(
                api("/api/activities/log"),
                jsonOf("activityId" to activityId, "type" to type, "title" to title, "summary" to summary, "metadata" to metadata),
                authHeader(),
            ).str("activityId").ifBlank { null }
        }.getOrNull()
    }

    suspend fun activities(limit: Int = 100): List<Activity> {
        val arr = Http.get(api("/api/activities?limit=$limit"), authHeader()).optJSONArray("activities") ?: return emptyList()
        return (0 until arr.length()).map { toActivity(arr.getJSONObject(it)) }
    }

    suspend fun activity(id: String): Activity? {
        val arr = Http.get(api("/api/activities?id=${URLEncoder.encode(id, "UTF-8")}"), authHeader()).optJSONArray("activities")
        return arr?.optJSONObject(0)?.let(::toActivity)
    }

    private fun toActivity(o: JSONObject) = Activity(
        o.str("id"), o.str("type"), o.str("title"), o.str("summary"),
        o.optJSONObject("metadata") ?: JSONObject(), o.str("created_at"),
    )
}
