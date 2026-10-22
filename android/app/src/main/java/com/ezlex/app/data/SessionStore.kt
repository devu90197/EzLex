package com.ezlex.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.ezlex.app.BuildConfig
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.store by preferencesDataStore(name = "ezlex_session")

data class Session(
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: Long, // epoch seconds
    val userId: String,
    val email: String,
    val fullName: String,
)

/** Persists the signed-in session on-device (excluded from backups, see data_extraction_rules.xml). */
class SessionStore(private val context: Context) {
    private object K {
        val access = stringPreferencesKey("access")
        val refresh = stringPreferencesKey("refresh")
        val expires = longPreferencesKey("expires")
        val uid = stringPreferencesKey("uid")
        val email = stringPreferencesKey("email")
        val name = stringPreferencesKey("name")
        val apiUrl = stringPreferencesKey("api_url")
    }

    val sessionFlow = context.store.data.map { p ->
        val access = p[K.access] ?: return@map null
        Session(access, p[K.refresh].orEmpty(), p[K.expires] ?: 0, p[K.uid].orEmpty(), p[K.email].orEmpty(), p[K.name].orEmpty())
    }

    suspend fun current(): Session? = sessionFlow.first()

    suspend fun save(s: Session) = context.store.edit { p ->
        p[K.access] = s.accessToken
        p[K.refresh] = s.refreshToken
        p[K.expires] = s.expiresAt
        p[K.uid] = s.userId
        p[K.email] = s.email
        p[K.name] = s.fullName
    }

    suspend fun clear() = context.store.edit { p ->
        listOf(K.access, K.refresh, K.uid, K.email, K.name).forEach { p.remove(it) }
        p.remove(K.expires)
    }

    /** Backend address; can be changed in-app (Profile → Server) for testing on a local network. */
    suspend fun apiUrl(): String = context.store.data.first()[K.apiUrl]?.takeIf { it.isNotBlank() } ?: BuildConfig.API_URL

    suspend fun setApiUrl(url: String) = context.store.edit { p ->
        if (url.isBlank()) p.remove(K.apiUrl) else p[K.apiUrl] = url.trim().trimEnd('/')
    }
}
