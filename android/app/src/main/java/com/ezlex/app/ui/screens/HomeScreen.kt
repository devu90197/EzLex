package com.ezlex.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.data.Activity
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.LocalStore
import com.ezlex.app.ui.Routes
import com.ezlex.app.ui.components.GlassCard
import com.ezlex.app.ui.components.IconBadge
import com.ezlex.app.ui.components.LiquidBackground
import com.ezlex.app.ui.components.reveal
import com.ezlex.app.ui.theme.Ez

private data class Feature(val title: String, val desc: String, val icon: ImageVector, val color: Color, val route: String)

private val features = listOf(
    Feature("Know Your Rights", "Plain-language answers on Indian law", Icons.Filled.MenuBook, Ez.Indigo, Routes.RIGHTS),
    Feature("AI Legal Chat", "Ask follow-up legal questions", Icons.AutoMirrored.Filled.Chat, Ez.Blue, Routes.CHAT),
    Feature("Track Case", "Live High Court of Karnataka status", Icons.Filled.Gavel, Ez.Amber, Routes.CASES),
    Feature("Draft Document", "Rental agreement, ready as PDF", Icons.Filled.Description, Ez.Emerald, Routes.DRAFT),
    Feature("Get Help", "Emergency numbers & nearby offices", Icons.Filled.SupportAgent, Ez.Rose, Routes.HELP),
    Feature("History", "Everything you searched & drafted", Icons.Filled.History, Color(0xFF9333EA), Routes.HISTORY),
)

fun activityRoute(a: Activity): String? = when (a.type) {
    "AI_CHAT" -> Routes.withAid(Routes.CHAT, a.id)
    "DRAFT" -> Routes.withAid(Routes.DRAFT, a.id)
    "CASE_TRACK" -> Routes.withAid(Routes.CASES, a.id)
    "RIGHTS_VIEW" -> Routes.withAid(Routes.RIGHTS, a.id)
    else -> null
}

@Composable
fun HomeScreen(navigate: (String) -> Unit, onSignedOut: () -> Unit) {
    val repo = LocalRepo.current
    val session by LocalStore.current.sessionFlow.collectAsState(initial = null)
    var recent by remember { mutableStateOf<List<Activity>>(emptyList()) }

    LaunchedEffect(Unit) {
        if (repo.validSession() == null) { onSignedOut(); return@LaunchedEffect }
        recent = runCatching { repo.activities(5) }.getOrDefault(emptyList())
    }

    val name = session?.fullName?.ifBlank { null } ?: session?.email?.substringBefore('@') ?: ""
    val initials = name.split(" ").filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1).uppercase() }.ifBlank { "U" }

    LiquidBackground {
        Column(
            Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.reveal()) {
                Column(Modifier.weight(1f)) {
                    Text("Welcome back,", fontSize = 14.sp, color = Ez.Slate)
                    Text(
                        name.split(" ").first().ifBlank { "Citizen" }, fontSize = 28.sp, fontWeight = FontWeight.Black,
                        style = androidx.compose.ui.text.TextStyle(brush = Brush.horizontalGradient(listOf(Ez.Blue, Ez.Indigo, Ez.Fuchsia))),
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                }
                Box(
                    Modifier.size(46.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Ez.Blue, Ez.Indigo)))
                        .border(2.dp, Color.White, CircleShape).clickable { navigate(Routes.PROFILE) },
                    contentAlignment = Alignment.Center,
                ) { Text(initials, color = Color.White, fontWeight = FontWeight.Bold) }
            }

            // Hero: AI legal assistance
            Box(
                Modifier.fillMaxWidth().reveal(1).clip(RoundedCornerShape(26.dp))
                    .background(Brush.linearGradient(listOf(Color(0xFF3B82F6), Ez.Blue, Ez.Indigo)))
                    .border(1.dp, Color.White.copy(alpha = 0.4f), RoundedCornerShape(26.dp))
                    .clickable { navigate(Routes.CHAT) }.padding(20.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(52.dp).clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Icons.AutoMirrored.Filled.Chat, null, tint = Color.White, modifier = Modifier.size(28.dp)) }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text("LAUNCH NOW", fontSize = 11.sp, letterSpacing = 2.sp, color = Color.White.copy(alpha = 0.8f), fontWeight = FontWeight.Bold)
                        Text("AI Legal Assistance", fontSize = 21.sp, fontWeight = FontWeight.Black, color = Color.White)
                    }
                    Box(Modifier.size(38.dp).clip(CircleShape).background(Color.White), contentAlignment = Alignment.Center) {
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Ez.Blue)
                    }
                }
            }

            features.chunked(2).forEachIndexed { r, row ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEachIndexed { c, f ->
                        GlassCard(Modifier.weight(1f).height(150.dp).reveal(2 + r * 2 + c), onClick = { navigate(f.route) }) {
                            IconBadge(f.icon, f.color)
                            Spacer(Modifier.weight(1f))
                            Text(f.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ez.Ink)
                            Text(f.desc, fontSize = 12.sp, color = Ez.Slate, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }

            if (recent.isNotEmpty()) {
                Text("Recent activity", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ez.Ink, modifier = Modifier.padding(top = 4.dp))
                GlassCard(Modifier.fillMaxWidth().reveal(8), padding = 4.dp) {
                    recent.forEach { a -> ActivityRow(a) { activityRoute(a)?.let(navigate) } }
                }
            }

            Text(
                "EzLex gives general legal information, not legal advice. For your specific situation, consult a qualified advocate.",
                fontSize = 11.sp, color = Ez.Muted, modifier = Modifier.padding(vertical = 8.dp),
            )
        }
    }
}
