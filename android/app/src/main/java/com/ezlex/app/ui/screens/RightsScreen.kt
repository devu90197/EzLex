package com.ezlex.app.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.data.ApiException
import com.ezlex.app.data.jsonOf
import com.ezlex.app.data.str
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.components.Banner
import com.ezlex.app.ui.components.Chip
import com.ezlex.app.ui.components.GlassCard
import com.ezlex.app.ui.components.GlassField
import com.ezlex.app.ui.components.GlassScreen
import com.ezlex.app.ui.components.MarkdownText
import com.ezlex.app.ui.components.PrimaryButton
import com.ezlex.app.ui.components.reveal
import com.ezlex.app.ui.theme.Ez
import kotlinx.coroutines.launch

val languages = listOf("English", "Hindi", "Kannada", "Telugu", "Tamil")

private val examples = listOf(
    "My landlord won't return my deposit",
    "What are my rights if arrested?",
    "How do I file an FIR online?",
    "Employer hasn't paid salary for 2 months",
)

@Composable
fun RightsScreen(aid: String?, onBack: () -> Unit) {
    val repo = LocalRepo.current
    val scope = rememberCoroutineScope()
    var query by rememberSaveable { mutableStateOf("") }
    var language by rememberSaveable { mutableStateOf("English") }
    var answer by rememberSaveable { mutableStateOf<String?>(null) }
    var asked by rememberSaveable { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(aid) {
        if (aid == null || answer != null) return@LaunchedEffect
        runCatching { repo.activity(aid) }.getOrNull()?.metadata?.let { m ->
            asked = m.str("query"); query = asked
            language = m.str("language").ifBlank { "English" }
            answer = m.str("result").ifBlank { null }
        }
    }

    fun ask(q: String) {
        if (q.isBlank()) return
        error = null; loading = true; answer = null
        scope.launch {
            try {
                val res = repo.askRights(q.trim(), language)
                answer = res; asked = q.trim()
                repo.logActivity(
                    "RIGHTS_VIEW", "Rights: ${q.trim().take(40)}${if (q.length > 40) "..." else ""}",
                    "Viewed legal rights analysis in $language",
                    jsonOf("query" to q.trim(), "language" to language, "result" to res),
                )
            } catch (e: ApiException) { error = e.message } finally { loading = false }
        }
    }

    GlassScreen("Know Your Rights", onBack) {
        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GlassCard(Modifier.fillMaxWidth().reveal()) {
                Text("Ask about any legal situation", fontWeight = FontWeight.Bold, color = Ez.Ink)
                Text("Answers grounded in the Bharatiya Nyaya Sanhita and Indian law.", fontSize = 12.sp, color = Ez.Slate)
                GlassField(query, { query = it }, "Describe your situation…", singleLine = false, minLines = 3, maxLength = 1000, modifier = Modifier.padding(top = 10.dp))
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    languages.forEach { l -> Chip(l, l == language, { language = l }, Ez.Indigo) }
                }
                PrimaryButton("Explain My Rights", { ask(query) }, loading = loading, enabled = query.isNotBlank(), icon = Icons.AutoMirrored.Filled.Send, color = Ez.Indigo)
            }

            if (answer == null && !loading) {
                Text("Try asking", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Ez.Slate)
                examples.forEachIndexed { i, e ->
                    GlassCard(Modifier.fillMaxWidth().reveal(i + 1), padding = 12.dp, onClick = { query = e; ask(e) }) {
                        Text(e, fontSize = 13.sp, color = Ez.Ink)
                    }
                }
            }

            error?.let { Banner(it) }

            answer?.let {
                GlassCard(Modifier.fillMaxWidth().reveal()) {
                    Text(asked, fontSize = 12.sp, color = Ez.Slate, fontWeight = FontWeight.SemiBold)
                    Text("Answer · $language", fontSize = 11.sp, color = Ez.Indigo, fontWeight = FontWeight.Bold, modifier = Modifier.padding(vertical = 6.dp))
                    MarkdownText(it)
                }
                Text("General legal information, not legal advice. Consult an advocate for your specific case.", fontSize = 11.sp, color = Ez.Muted)
            }
        }
    }
}
