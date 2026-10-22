package com.ezlex.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.data.Activity
import com.ezlex.app.data.ApiException
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.components.Banner
import com.ezlex.app.ui.components.Chip
import com.ezlex.app.ui.components.GlassCard
import com.ezlex.app.ui.components.GlassField
import com.ezlex.app.ui.components.GlassScreen
import com.ezlex.app.ui.components.IconBadge
import com.ezlex.app.ui.components.reveal
import com.ezlex.app.ui.theme.Ez
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

data class TypeStyle(val label: String, val icon: ImageVector, val color: Color)

val activityTypes = mapOf(
    "AI_CHAT" to TypeStyle("AI Chat", Icons.AutoMirrored.Filled.Chat, Ez.Blue),
    "DRAFT" to TypeStyle("Draft", Icons.Filled.Description, Ez.Emerald),
    "CASE_TRACK" to TypeStyle("Case Track", Icons.Filled.Gavel, Ez.Amber),
    "RIGHTS_VIEW" to TypeStyle("Rights View", Icons.Filled.MenuBook, Color(0xFF9333EA)),
    "DOCUMENT" to TypeStyle("Document", Icons.Filled.Description, Ez.Rose),
)

private fun parseTime(iso: String) = runCatching { OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.systemDefault()) }.getOrNull()
fun formatTime(iso: String): String = parseTime(iso)?.format(DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a", Locale.ENGLISH)) ?: iso
private fun dayOf(iso: String): String = parseTime(iso)?.format(DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.ENGLISH)) ?: ""

@Composable
fun ActivityRow(a: Activity, onClick: () -> Unit) {
    val style = activityTypes[a.type] ?: TypeStyle(a.type, Icons.Filled.History, Ez.Slate)
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBadge(style.icon, style.color, 38.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(a.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Ez.Ink, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (a.summary.isNotBlank()) Text(a.summary, fontSize = 12.sp, color = Ez.Slate, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${style.label} · ${formatTime(a.createdAt)}", fontSize = 11.sp, color = Ez.Muted)
        }
    }
}

@Composable
fun HistoryScreen(onBack: () -> Unit, open: (String) -> Unit) {
    val repo = LocalRepo.current
    var items by remember { mutableStateOf<List<Activity>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var filter by rememberSaveable { mutableStateOf("ALL") }
    var query by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(Unit) {
        try { items = repo.activities(100) } catch (e: ApiException) { error = e.message; items = emptyList() }
    }

    val shown = items.orEmpty().filter { a ->
        (filter == "ALL" || a.type == filter) &&
            (query.isBlank() || a.title.contains(query, true) || a.summary.contains(query, true))
    }
    val grouped = shown.groupBy { dayOf(it.createdAt) }

    GlassScreen("Activity History", onBack) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            GlassField(query, { query = it }, "Search activities…", leading = Icons.Filled.Search)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("All", filter == "ALL", { filter = "ALL" })
                activityTypes.filterKeys { it != "DOCUMENT" }.forEach { (k, s) -> Chip(s.label, filter == k, { filter = k }, s.color) }
            }
            error?.let { Banner(it) }
        }
        when {
            items == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            shown.isEmpty() -> GlassCard(Modifier.padding(16.dp).fillMaxWidth().reveal()) {
                Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.History, null, tint = Ez.Muted, modifier = Modifier.size(40.dp))
                    Text("No activities found", fontWeight = FontWeight.SemiBold, color = Ez.Slate, modifier = Modifier.padding(top = 8.dp))
                    Text("Search a case, ask a question or draft a document.", fontSize = 12.sp, color = Ez.Slate)
                }
            }
            else -> LazyColumn(Modifier.fillMaxSize().navigationBarsPadding(), contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp, 0.dp, 16.dp, 24.dp)) {
                grouped.forEach { (day, acts) ->
                    item(key = "h$day") { Text(day, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Ez.Slate, modifier = Modifier.padding(vertical = 8.dp)) }
                    items(acts, key = { it.id }) { a ->
                        GlassCard(Modifier.fillMaxWidth().padding(bottom = 6.dp), padding = 2.dp) {
                            ActivityRow(a) { activityRoute(a)?.let(open) }
                        }
                    }
                }
            }
        }
    }
}
