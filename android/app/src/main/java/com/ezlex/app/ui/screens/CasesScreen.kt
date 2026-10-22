package com.ezlex.app.ui.screens

import android.annotation.SuppressLint
import android.graphics.BitmapFactory
import android.util.Base64
import android.webkit.WebView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.ezlex.app.data.ApiException
import com.ezlex.app.data.Captcha
import com.ezlex.app.data.CaseResult
import com.ezlex.app.data.CaseType
import com.ezlex.app.data.jsonOf
import com.ezlex.app.data.str
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.components.Banner
import com.ezlex.app.ui.components.GlassCard
import com.ezlex.app.ui.components.GlassField
import com.ezlex.app.ui.components.GlassScreen
import com.ezlex.app.ui.components.GlassTabs
import com.ezlex.app.ui.components.PrimaryButton
import com.ezlex.app.ui.components.TextLink
import com.ezlex.app.ui.components.reveal
import com.ezlex.app.ui.theme.Ez
import kotlinx.coroutines.launch

private val benches = listOf("B" to "Bengaluru", "D" to "Dharwad", "K" to "Kalaburagi")

@Composable
fun CasesScreen(aid: String?, onBack: () -> Unit) {
    val repo = LocalRepo.current
    val scope = rememberCoroutineScope()

    var types by remember { mutableStateOf<List<CaseType>>(emptyList()) }
    var bench by rememberSaveable { mutableStateOf("B") }
    var caseType by rememberSaveable { mutableStateOf("") }
    var caseNo by rememberSaveable { mutableStateOf("") }
    var caseYear by rememberSaveable { mutableStateOf("") }
    var captchaText by remember { mutableStateOf("") }
    var captcha by remember { mutableStateOf<Captcha?>(null) }
    var captchaLoading by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var result by remember { mutableStateOf<CaseResult?>(null) }
    var savedAt by remember { mutableStateOf<String?>(null) }
    var pickType by remember { mutableStateOf(false) }

    fun loadCaptcha() {
        captchaLoading = true; captchaText = ""
        scope.launch {
            try { captcha = repo.captcha() } catch (e: ApiException) { error = e.message } finally { captchaLoading = false }
        }
    }

    LaunchedEffect(Unit) {
        types = runCatching { repo.caseTypes() }.getOrDefault(emptyList())
        if (aid != null) {
            runCatching { repo.activity(aid) }.getOrNull()?.let { act ->
                val m = act.metadata
                bench = m.str("bench").ifBlank { "B" }; caseType = m.str("caseType"); caseNo = m.str("caseNo"); caseYear = m.str("caseYear")
                m.optJSONObject("result")?.let { result = repo.parseCase(it); savedAt = act.createdAt }
            }
        }
        if (result == null) loadCaptcha()
    }

    fun search() {
        val c = captcha ?: return
        error = null; loading = true
        scope.launch {
            try {
                val r = repo.searchCase(c, bench, caseType, caseNo, caseYear, captchaText)
                result = r; savedAt = null
                if (r.found) {
                    val petitioner = r.fields.firstOrNull { it.label == "Petitioner" }?.value
                    val respondent = r.fields.firstOrNull { it.label == "Respondent" }?.value
                    repo.logActivity(
                        "CASE_TRACK", "Case: $caseType $caseNo/$caseYear",
                        listOfNotNull(r.status.ifBlank { null }, "${benches.first { it.first == bench }.second} Bench",
                            if (petitioner != null && respondent != null) "$petitioner vs $respondent" else null).joinToString(" · "),
                        jsonOf("bench" to bench, "caseType" to caseType, "caseNo" to caseNo, "caseYear" to caseYear, "result" to r.raw),
                    )
                }
            } catch (e: ApiException) {
                error = e.message
                if (e.code == "BAD_CAPTCHA") loadCaptcha()
            } finally { loading = false }
        }
    }

    GlassScreen("Track Your Case", onBack) {
        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val r = result
            if (r == null) {
                Text("Live case status from the High Court of Karnataka.", fontSize = 13.sp, color = Ez.Slate)
                GlassCard(Modifier.fillMaxWidth().reveal()) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Bench", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Ez.Slate)
                        GlassTabs(benches, bench, { bench = it })
                        Box(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = 0.5f))
                                .border(1.dp, Color.White, RoundedCornerShape(16.dp)).clickable { pickType = true }.padding(16.dp),
                        ) {
                            Text(
                                types.firstOrNull { it.value == caseType }?.label ?: if (types.isEmpty()) "Loading case types…" else "Select case type *",
                                color = if (caseType.isBlank()) Ez.Slate else Ez.Ink, fontSize = 14.sp,
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            GlassField(caseNo, { caseNo = it }, "Case number", Modifier.weight(1f), KeyboardType.Number, digitsOnly = true, maxLength = 6)
                            GlassField(caseYear, { caseYear = it }, "Year", Modifier.weight(0.7f), KeyboardType.Number, digitsOnly = true, maxLength = 4)
                        }
                        Text("Captcha (from the court)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Ez.Slate)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(
                                Modifier.weight(1f).height(56.dp).clip(RoundedCornerShape(14.dp)).background(Color.White)
                                    .border(1.dp, Color.White, RoundedCornerShape(14.dp)),
                                contentAlignment = Alignment.Center,
                            ) {
                                val bmp = remember(captcha) {
                                    captcha?.imageDataUri?.substringAfter("base64,")?.let { b64 ->
                                        runCatching { Base64.decode(b64, Base64.DEFAULT).let { BitmapFactory.decodeByteArray(it, 0, it.size) } }.getOrNull()
                                    }
                                }
                                if (captchaLoading || bmp == null) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                                else Image(bmp.asImageBitmap(), "Court captcha", Modifier.fillMaxSize().padding(6.dp))
                            }
                            IconButton(::loadCaptcha) { Icon(Icons.Filled.Refresh, "New captcha", tint = Ez.Indigo) }
                            GlassField(captchaText, { captchaText = it }, "Enter", Modifier.weight(1f), KeyboardType.Number, digitsOnly = true, maxLength = 6)
                        }
                        error?.let { Banner(it) }
                        PrimaryButton(
                            "Get Case Status", ::search, loading = loading, color = Ez.Indigo, icon = Icons.Filled.Search,
                            enabled = caseType.isNotBlank() && caseNo.isNotBlank() && caseYear.length == 4 && captchaText.length == 6 && !captchaLoading,
                        )
                    }
                }
                Text(
                    "Case numbers follow each bench's range: Bengaluru (e.g. 100), Dharwad (from 100001), Kalaburagi (from 200001). Typing the captcha is required by the court.",
                    fontSize = 11.sp, color = Ez.Muted,
                )
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextLink("← New search", { result = null; savedAt = null; error = null; loadCaptcha() })
                    Spacer(Modifier.weight(1f))
                    Text("Source: High Court of Karnataka", fontSize = 11.sp, color = Ez.Muted)
                }
                savedAt?.let {
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Ez.Amber.copy(alpha = 0.12f)).padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.History, null, tint = Ez.Amber, modifier = Modifier.size(16.dp))
                        Text(" Saved result from ${formatTime(it)}", fontSize = 12.sp, color = Color(0xFF92400E), modifier = Modifier.weight(1f))
                        TextLink("Refresh live", { result = null; savedAt = null; loadCaptcha() }, color = Color(0xFF92400E))
                    }
                }
                if (!r.found) {
                    GlassCard(Modifier.fillMaxWidth()) { Text("No case found for these details. Check the bench, case type, number and year.", color = Ez.Slate) }
                } else {
                    Summary(r)
                    val withData = r.sections.filter { it.html.isNotBlank() }
                    if (r.sections.isNotEmpty()) Text("Full case details", fontWeight = FontWeight.Bold, color = Ez.Ink, fontSize = 14.sp)
                    r.sections.forEach { s -> SectionPanel(s.title, s.html, s.failed) }
                    if (withData.isEmpty() && r.fields.isEmpty() && r.html.isNotBlank()) HtmlBlock(r.html)
                }
            }
        }
    }

    if (pickType) TypePicker(types, onPick = { caseType = it; pickType = false }, onDismiss = { pickType = false })
}

@Composable
private fun Summary(r: CaseResult) {
    GlassCard(Modifier.fillMaxWidth().reveal()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(r.fields.firstOrNull { it.label == "Case Number" }?.value ?: "Case", fontWeight = FontWeight.ExtraBold, color = Ez.Ink, fontSize = 15.sp, modifier = Modifier.weight(1f))
            if (r.status.isNotBlank()) {
                val c = if (r.status.contains("dispos", true)) Ez.Emerald else Ez.Amber
                Text(r.status, color = c, fontWeight = FontWeight.Bold, fontSize = 12.sp,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(c.copy(alpha = 0.14f)).padding(horizontal = 10.dp, vertical = 4.dp))
            }
        }
        Spacer(Modifier.height(10.dp))
        r.fields.filter { it.label != "Case Number" }.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
                row.forEach { f ->
                    Column(
                        Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.55f))
                            .border(1.dp, Color.White.copy(alpha = 0.8f), RoundedCornerShape(12.dp)).padding(horizontal = 10.dp, vertical = 8.dp),
                    ) {
                        Text(f.label.uppercase(), fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Ez.Muted, letterSpacing = 0.5.sp, maxLines = 1)
                        Text(f.value, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Ez.Ink)
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun SectionPanel(title: String, html: String, failed: Boolean) {
    var open by remember { mutableStateOf(false) }
    val empty = html.isBlank()
    GlassCard(Modifier.fillMaxWidth(), padding = 0.dp, shape = RoundedCornerShape(16.dp)) {
        Row(
            Modifier.fillMaxWidth().clickable(enabled = !empty) { open = !open }.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (empty) Ez.Muted else Ez.Ink, modifier = Modifier.weight(1f))
            if (empty) Text(if (failed) "Could not load" else "No records", fontSize = 11.sp, color = Ez.Muted)
            else Icon(Icons.Filled.ExpandMore, null, tint = Ez.Slate, modifier = Modifier.rotate(if (open) 180f else 0f))
        }
        AnimatedVisibility(open && !empty, enter = expandVertically(), exit = shrinkVertically()) {
            Box(Modifier.padding(horizontal = 8.dp).padding(bottom = 10.dp)) { HtmlBlock(html) }
        }
    }
}

/** Court HTML (already sanitized server-side) shown with JavaScript disabled. */
@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun HtmlBlock(html: String) {
    val page = """<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        body{margin:0;font-family:sans-serif;font-size:12px;color:#1e293b;background:transparent;word-wrap:break-word}
        table{width:100%;border-collapse:collapse;margin:4px 0}
        th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left;vertical-align:top}
        th{background:#eef2ff;color:#3730a3}
        b,strong{color:#3730a3} a{color:#4f46e5} img{display:none}
        .row{padding:3px 0;border-bottom:1px solid #e2e8f0}
        </style></head><body>$html</body></html>"""
    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = false
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                isVerticalScrollBarEnabled = false
            }
        },
        update = { it.loadDataWithBaseURL("https://judiciary.karnataka.gov.in/", page, "text/html", "utf-8", null) },
        modifier = Modifier.fillMaxWidth().heightIn(min = 40.dp),
    )
}

@Composable
private fun TypePicker(types: List<CaseType>, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    var q by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {},
        dismissButton = { TextLink("Close", onDismiss) },
        title = { Text("Case type") },
        text = {
            Column {
                GlassField(q, { q = it }, "Search (e.g. WP, RFA)", leading = Icons.Filled.Search)
                LazyColumn(Modifier.heightIn(max = 380.dp).padding(top = 8.dp)) {
                    items(types.filter { it.label.contains(q, true) }) { t ->
                        Text(
                            t.label, fontSize = 13.sp, color = Ez.Ink,
                            modifier = Modifier.fillMaxWidth().clickable { onPick(t.value) }.padding(vertical = 10.dp, horizontal = 4.dp),
                        )
                    }
                }
            }
        },
    )
}

