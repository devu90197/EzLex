package com.ezlex.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.data.ApiException
import com.ezlex.app.data.jsonOf
import com.ezlex.app.data.str
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.components.GlassField
import com.ezlex.app.ui.components.GlassScreen
import com.ezlex.app.ui.components.MarkdownText
import com.ezlex.app.ui.components.reveal
import com.ezlex.app.ui.theme.Ez
import kotlinx.coroutines.launch
import org.json.JSONArray

private data class Msg(val role: String, val content: String) // role: "user" | "assistant"

private const val GREETING =
    "Namaste! I'm your EzLex legal assistant. Describe your situation and I'll explain the relevant Indian laws (BNS, IPC, consumer, tenancy, labour…) and what you can do next."

@Composable
fun ChatScreen(aid: String?, onBack: () -> Unit) {
    val repo = LocalRepo.current
    val scope = rememberCoroutineScope()
    val messages = remember { mutableStateListOf(Msg("assistant", GREETING)) }
    var input by remember { mutableStateOf("") }
    var thinking by remember { mutableStateOf(false) }
    var activityId by remember { mutableStateOf(aid) }
    val list = rememberLazyListState()

    LaunchedEffect(aid) {
        if (aid == null) return@LaunchedEffect
        val arr = runCatching { repo.activity(aid) }.getOrNull()?.metadata?.optJSONArray("messages") ?: return@LaunchedEffect
        messages.clear()
        for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { messages.add(Msg(it.str("role").ifBlank { "assistant" }, it.str("content"))) }
    }
    LaunchedEffect(messages.size, thinking) { if (messages.isNotEmpty()) list.animateScrollToItem(messages.size - 1 + if (thinking) 1 else 0) }

    fun send() {
        val q = input.trim()
        if (q.isBlank() || thinking) return
        input = ""
        messages.add(Msg("user", q))
        thinking = true
        scope.launch {
            // Give the model the recent conversation so follow-up questions make sense
            val context = messages.drop(1).dropLast(1).takeLast(6).joinToString("\n") { "${if (it.role == "user") "User" else "Assistant"}: ${it.content.take(600)}" }
            val prompt = if (context.isBlank()) q else "Conversation so far:\n$context\n\nNew question: $q"
            val reply = try { repo.askRights(prompt, "English") } catch (e: ApiException) { "⚠️ ${e.message}" }
            messages.add(Msg("assistant", reply))
            thinking = false

            val arr = JSONArray()
            messages.forEachIndexed { i, m -> arr.put(jsonOf("id" to "$i", "role" to m.role, "content" to m.content)) }
            val first = messages.firstOrNull { it.role == "user" }?.content ?: q
            repo.logActivity(
                "AI_CHAT", first.take(40) + if (first.length > 40) "..." else "",
                "Legal query regarding BNS/IPC statutes", jsonOf("messages" to arr), activityId,
            )?.let { activityId = it }
        }
    }

    GlassScreen("AI Legal Chat", onBack) {
        LazyColumn(
            Modifier.weight(1f).fillMaxWidth(), state = list,
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(messages) { m -> Bubble(m) }
            if (thinking) item {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(4.dp)) {
                    CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                    Text("  Analysing Indian law…", fontSize = 12.sp, color = Ez.Slate)
                }
            }
        }
        Row(
            Modifier.fillMaxWidth().background(Color.White.copy(alpha = 0.6f)).navigationBarsPadding().imePadding().padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            GlassField(input, { input = it }, "Ask a legal question…", modifier = Modifier.weight(1f), singleLine = false, maxLength = 1000)
            Box(
                Modifier.padding(start = 8.dp).size(50.dp).clip(CircleShape)
                    .background(Brush.linearGradient(listOf(Ez.Blue, Ez.Indigo))),
                contentAlignment = Alignment.Center,
            ) {
                IconButton(::send, enabled = input.isNotBlank() && !thinking) { Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = Color.White) }
            }
        }
    }
}

@Composable
private fun Bubble(m: Msg) {
    val mine = m.role == "user"
    Box(Modifier.fillMaxWidth().reveal(), contentAlignment = if (mine) Alignment.CenterEnd else Alignment.CenterStart) {
        val shape = RoundedCornerShape(18.dp, 18.dp, if (mine) 4.dp else 18.dp, if (mine) 18.dp else 4.dp)
        Box(
            Modifier.widthIn(max = 320.dp).clip(shape)
                .background(if (mine) Brush.linearGradient(listOf(Ez.Blue, Ez.Indigo)) else Brush.linearGradient(listOf(Color.White.copy(alpha = 0.8f), Color.White.copy(alpha = 0.55f))))
                .border(1.dp, Color.White.copy(alpha = if (mine) 0.3f else 0.9f), shape)
                .padding(12.dp),
        ) {
            if (mine) Text(m.content, color = Color.White, fontSize = 14.sp) else MarkdownText(m.content)
        }
    }
}
