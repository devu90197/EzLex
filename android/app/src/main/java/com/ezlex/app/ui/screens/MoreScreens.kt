package com.ezlex.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.LocalPolice
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Policy
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material.icons.filled.Woman
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.BuildConfig
import com.ezlex.app.data.ApiException
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.LocalStore
import com.ezlex.app.ui.components.Banner
import com.ezlex.app.ui.components.GlassCard
import com.ezlex.app.ui.components.GlassField
import com.ezlex.app.ui.components.GlassScreen
import com.ezlex.app.ui.components.IconBadge
import com.ezlex.app.ui.components.MarkdownText
import com.ezlex.app.ui.components.PrimaryButton
import com.ezlex.app.ui.components.TextLink
import com.ezlex.app.ui.components.reveal
import com.ezlex.app.ui.theme.Ez
import kotlinx.coroutines.launch

// ───────────────────────── Get Help ─────────────────────────

private data class Helpline(val name: String, val number: String, val icon: ImageVector, val color: Color)

private val helplines = listOf(
    Helpline("Emergency (Police / Fire / Ambulance)", "112", Icons.Filled.LocalPolice, Ez.Rose),
    Helpline("Women Helpline", "1091", Icons.Filled.Woman, Color(0xFFDB2777)),
    Helpline("NALSA Free Legal Aid", "15100", Icons.Filled.Gavel, Ez.Indigo),
    Helpline("Cyber Crime Helpline", "1930", Icons.Filled.Policy, Ez.Blue),
    Helpline("Child Helpline", "1098", Icons.Filled.VolunteerActivism, Ez.Amber),
)

private val nearby = listOf(
    "Police stations" to "police station",
    "Courts" to "district court",
    "Legal aid offices" to "legal services authority",
    "Women protection cells" to "women police station",
)

@Composable
fun HelpScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    fun open(i: Intent) = runCatching { ctx.startActivity(i) }
    GlassScreen("Get Help", onBack) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text("Tap to call — opens your dialer, nothing is dialled automatically.", fontSize = 12.sp, color = Ez.Slate)
            helplines.forEachIndexed { i, h ->
                GlassCard(Modifier.fillMaxWidth().reveal(i), padding = 12.dp, onClick = { open(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${h.number}"))) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(h.icon, h.color, 40.dp)
                        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                            Text(h.name, fontWeight = FontWeight.SemiBold, color = Ez.Ink, fontSize = 14.sp)
                            Text(h.number, fontWeight = FontWeight.Black, color = h.color, fontSize = 18.sp)
                        }
                        Icon(Icons.Filled.Call, "Call", tint = h.color)
                    }
                }
            }
            Text("Find near you", fontWeight = FontWeight.Bold, color = Ez.Ink, modifier = Modifier.padding(top = 8.dp))
            nearby.forEachIndexed { i, (label, query) ->
                GlassCard(Modifier.fillMaxWidth().reveal(i + 5), padding = 12.dp, onClick = {
                    open(Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode("$query near me"))))
                        .onFailure { open(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/" + Uri.encode("$query near me")))) }
                }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(Icons.Filled.Map, Ez.Emerald, 40.dp)
                        Text(label, fontWeight = FontWeight.SemiBold, color = Ez.Ink, modifier = Modifier.weight(1f).padding(horizontal = 12.dp))
                        Text("Open map", fontSize = 12.sp, color = Ez.Emerald, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

// ───────────────────────── Profile ─────────────────────────

@Composable
fun ProfileScreen(onBack: () -> Unit, onSignedOut: () -> Unit, onPrivacy: () -> Unit) {
    val repo = LocalRepo.current
    val store = LocalStore.current
    val scope = rememberCoroutineScope()
    val session by store.sessionFlow.collectAsState(initial = null)
    var confirmDelete by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var server by remember { mutableStateOf("") }
    var serverSaved by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { server = store.apiUrl() }

    GlassScreen("Profile", onBack) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            GlassCard(Modifier.fillMaxWidth().reveal()) {
                Text(session?.fullName?.ifBlank { null } ?: "EzLex user", fontSize = 20.sp, fontWeight = FontWeight.Black, color = Ez.Ink)
                Text(session?.email.orEmpty(), color = Ez.Slate)
            }
            GlassCard(Modifier.fillMaxWidth().reveal(1), padding = 4.dp) {
                MenuRow(Icons.Filled.Policy, "Privacy Policy", Ez.Indigo, onPrivacy)
                MenuRow(Icons.AutoMirrored.Filled.Logout, "Sign out", Ez.Slate) {
                    scope.launch { repo.logout(); onSignedOut() }
                }
                MenuRow(Icons.Filled.DeleteForever, "Delete my account", Ez.Rose) { confirmDelete = true }
            }
            error?.let { Banner(it) }

            GlassCard(Modifier.fillMaxWidth().reveal(2)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Dns, null, tint = Ez.Slate)
                    Spacer(Modifier.width(8.dp))
                    Text("Server address", fontWeight = FontWeight.Bold, color = Ez.Ink)
                }
                Text("Only change this if your EzLex administrator asks you to.", fontSize = 11.sp, color = Ez.Slate)
                GlassField(server, { server = it; serverSaved = false }, "EzLex server URL", modifier = Modifier.padding(vertical = 8.dp))
                Row {
                    TextLink(if (serverSaved) "Saved ✓" else "Save", { scope.launch { store.setApiUrl(server); serverSaved = true } })
                    TextLink("Reset to default", { scope.launch { store.setApiUrl(""); server = BuildConfig.API_URL; serverSaved = true } }, color = Ez.Slate)
                }
            }
            Text("EzLex v${BuildConfig.VERSION_NAME}", fontSize = 11.sp, color = Ez.Muted, modifier = Modifier.align(Alignment.CenterHorizontally))
        }
    }

    if (confirmDelete) AlertDialog(
        onDismissRequest = { if (!deleting) confirmDelete = false },
        title = { Text("Delete account?") },
        text = { Text("This permanently deletes your EzLex account, profile and all saved history. This cannot be undone.") },
        confirmButton = {
            PrimaryButton("Delete permanently", {
                deleting = true
                scope.launch {
                    try { repo.deleteAccount(); onSignedOut() }
                    catch (e: ApiException) { error = e.message; confirmDelete = false }
                    finally { deleting = false }
                }
            }, loading = deleting, color = Ez.Rose)
        },
        dismissButton = { TextLink("Cancel", { confirmDelete = false }, color = Ez.Slate) },
    )
}

@Composable
private fun MenuRow(icon: ImageVector, label: String, color: Color, onClick: () -> Unit) {
    GlassCard(Modifier.fillMaxWidth().padding(4.dp), padding = 12.dp, tint = Color.Transparent, onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(icon, color, 36.dp)
            Text(label, fontWeight = FontWeight.SemiBold, color = color.takeIf { it == Ez.Rose } ?: Ez.Ink, modifier = Modifier.padding(start = 12.dp))
        }
    }
}

// ───────────────────────── Privacy ─────────────────────────

const val PRIVACY_POLICY = """
# EzLex Privacy Policy

_Last updated: 22 October 2026_

EzLex ("we") provides legal information, case-status lookup and document drafting for people in India. This policy explains what data the EzLex app and website collect and why.

## What we collect
- **Account details:** name, email address, mobile number, role and (for lawyers/officials) a registration ID you provide.
- **Your activity:** questions you ask, case numbers you search, and documents you draft, so they appear in your History.
- **Technical data:** basic request logs needed to run and secure the service.

We do **not** collect your location, contacts, photos or files, and we do not sell your data or use it for advertising.

## How we use it
- To sign you in, verify your email (one-time codes) and reset your password.
- To answer legal questions using an AI model, look up public case status from the High Court of Karnataka, and prepare documents.
- To show your saved History across devices.

## Who we share it with
- **Supabase** (database and authentication) and **Google Gemini** (AI answers and drafting) process data on our behalf.
- **High Court of Karnataka:** the case details you enter are sent to the court's public website to fetch status.
- Email codes are sent through our email provider.

## Security & retention
Data is sent over encrypted connections. Sign-in tokens are stored only on your device and are excluded from backups. We keep your data while your account is active.

## Your choices
- **Delete your account** any time in the app: Profile → Delete my account. This permanently removes your account, profile and History.
- You can also request deletion by email to the address below.

## Not legal advice
EzLex provides general legal information. It is not a law firm and does not create a lawyer–client relationship.

## Contact
Questions or deletion requests: **info.factoresearch@gmail.com**
"""

@Composable
fun PrivacyScreen(onBack: () -> Unit) {
    GlassScreen("Privacy Policy", onBack) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(16.dp)) {
            GlassCard(Modifier.fillMaxWidth(), tint = Color.White.copy(alpha = 0.8f)) { MarkdownText(PRIVACY_POLICY.trim()) }
        }
    }
}
