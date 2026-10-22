package com.ezlex.app.ui.screens

import android.content.Context
import android.content.Intent
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.ezlex.app.data.ApiException
import com.ezlex.app.data.jsonOf
import com.ezlex.app.data.str
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.components.Banner
import com.ezlex.app.ui.components.Chip
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
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private data class F(val section: String, val key: String, val label: String, val number: Boolean = false, val max: Int = 200, val auto: Boolean = false)

private val sections = listOf(
    "owner" to "Owner (Landlord) Information",
    "tenant" to "Tenant Information",
    "property" to "Property Particulars",
    "lease" to "Lease & Financial Terms",
)

// Same fields as the website's Residential Rental Agreement
private val fields = listOf(
    F("owner", "landlordName", "Landlord full name"),
    F("owner", "landlordSuite", "Suite / Room no", max = 10),
    F("owner", "landlordAddress1", "Address line 1"),
    F("owner", "landlordAddress2", "Address line 2"),
    F("owner", "landlordLandmark", "Landmark"),
    F("owner", "landlordPincode", "Pincode", number = true, max = 6),
    F("owner", "landlordCity", "City (auto)", auto = true),
    F("owner", "landlordState", "State (auto)", auto = true),
    F("tenant", "tenantName", "Tenant full name"),
    F("tenant", "tenantSuite", "Suite / Room no", max = 10),
    F("tenant", "tenantAddress1", "Address line 1"),
    F("tenant", "tenantAddress2", "Address line 2"),
    F("tenant", "tenantLandmark", "Landmark"),
    F("tenant", "tenantPincode", "Pincode", number = true, max = 6),
    F("tenant", "tenantCity", "City (auto)", auto = true),
    F("tenant", "tenantState", "State (auto)", auto = true),
    F("property", "propertySuite", "Property house no", max = 10),
    F("property", "propertyAddress", "Main property address"),
    F("property", "propertyLandmark", "Property landmark"),
    F("property", "propertyPincode", "Property PIN", number = true, max = 6),
    F("property", "propertyCity", "City (auto)", auto = true),
    F("property", "propertyState", "State (auto)", auto = true),
    F("lease", "monthlyRent", "Monthly rent (₹)", number = true, max = 9),
    F("lease", "securityDeposit", "Security deposit (₹)", number = true, max = 9),
)
private val required = listOf("landlordName", "tenantName", "propertyAddress", "monthlyRent", "securityDeposit")

@Composable
fun DraftScreen(aid: String?, onBack: () -> Unit) {
    val repo = LocalRepo.current
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val values = remember { mutableStateMapOf<String, String>() }
    var years by rememberSaveable { mutableStateOf("1") }
    var months by rememberSaveable { mutableStateOf("0") }
    var section by rememberSaveable { mutableStateOf(0) }
    var draft by rememberSaveable { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var activityId by remember { mutableStateOf(aid) }

    LaunchedEffect(aid) {
        if (aid == null) return@LaunchedEffect
        val m = runCatching { repo.activity(aid) }.getOrNull()?.metadata ?: return@LaunchedEffect
        val data = m.optJSONObject("extractedData") ?: m.optJSONObject("formValues") ?: JSONObject()
        data.keys().forEach { k -> values[k] = data.str(k) }
        years = data.str("leaseYY").ifBlank { years }; months = data.str("leaseMM").ifBlank { months }
        draft = data.str("fullDraft").ifBlank { null } ?: buildTemplate(values, years, months)
    }

    // Pincode → City/State, like the website
    fields.filter { it.key.endsWith("Pincode") || it.key == "propertyPincode" }.forEach { f ->
        val pin = values[f.key].orEmpty()
        LaunchedEffect(pin) {
            if (pin.length == 6) repo.pincode(pin)?.let { info ->
                val prefix = f.key.removeSuffix("Pincode")
                values["${prefix}City"] = info.city; values["${prefix}State"] = info.state
            }
        }
    }

    fun generate() {
        val missing = required.filter { values[it].isNullOrBlank() }
        if (missing.isNotEmpty()) { error = "Please fill: " + missing.joinToString { k -> fields.first { it.key == k }.label }; return }
        error = null; loading = true
        scope.launch {
            val details = fields.filter { !it.auto && !values[it.key].isNullOrBlank() }.joinToString("|") { "${it.key}:${values[it.key]!!.trim()}" }
            val prompt = "Draft Residential Rental Agreement. Lease: ${years}Y ${months}M. Data: $details. Keep it concise, professional, legally dense. Max 800 output tokens. JSON only."
            val extracted = JSONObject().apply { values.forEach { (k, v) -> put(k, v) }; put("leaseYY", years); put("leaseMM", months) }
            try {
                val raw = repo.draft(listOf("user" to prompt), "Residential Rental Agreement")
                val parsed = runCatching { JSONObject(raw.replace("```json", "").replace("```", "").trim()) }.getOrNull()
                val ai = parsed?.optJSONObject("extractedData")
                ai?.keys()?.forEach { k -> if (k != "fullDraft") extracted.put(k, ai.get(k)) }
                draft = ai?.str("fullDraft")?.ifBlank { null } ?: buildTemplate(values, years, months)
            } catch (e: ApiException) {
                // AI unavailable: still give the user a complete standard agreement
                draft = buildTemplate(values, years, months)
                error = "AI drafting unavailable (${e.message}). A standard agreement was prepared instead."
            }
            extracted.put("fullDraft", draft)
            repo.logActivity(
                "DRAFT", "Drafting: Residential Rental Agreement", "Drafting session for a Residential Rental Agreement",
                jsonOf("selectedSubId" to "rental", "messages" to JSONArray(), "extractedData" to extracted, "step" to "studio", "isComplete" to true),
                activityId,
            )?.let { activityId = it }
            loading = false
        }
    }

    GlassScreen("Draft Document", onBack) {
        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val d = draft
            if (d == null) {
                GlassCard(Modifier.fillMaxWidth().reveal()) {
                    Row { IconBadge(Icons.Filled.Home, Ez.Emerald); Column(Modifier.padding(start = 12.dp)) {
                        Text("Residential Rental Agreement", fontWeight = FontWeight.Bold, color = Ez.Ink)
                        Text("About 2 minutes · Exports as PDF", fontSize = 12.sp, color = Ez.Slate)
                    } }
                }
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    sections.forEachIndexed { i, (_, label) -> Chip("${i + 1}. ${label.substringBefore(" (").substringBefore(" Information").substringBefore(" Particulars")}", i == section, { section = i }, Ez.Emerald) }
                }
                val (secId, secLabel) = sections[section]
                GlassCard(Modifier.fillMaxWidth()) {
                    Text(secLabel, fontWeight = FontWeight.Bold, color = Ez.Ink, modifier = Modifier.padding(bottom = 8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        fields.filter { it.section == secId }.forEach { f ->
                            GlassField(
                                values[f.key].orEmpty(), { values[f.key] = it }, f.label + if (f.key in required) " *" else "",
                                keyboardType = if (f.number) KeyboardType.Number else KeyboardType.Text,
                                digitsOnly = f.number, maxLength = f.max, enabled = !f.auto,
                            )
                        }
                        if (secId == "lease") {
                            Text("Lease duration", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Ez.Slate)
                            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("0", "1", "2", "3", "4", "5+").forEach { y -> Chip("$y yr", years == y, { years = y }, Ez.Emerald) }
                            }
                            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                (0..11).forEach { m -> Chip("$m mo", months == "$m", { months = "$m" }, Ez.Emerald) }
                            }
                        }
                    }
                }
                error?.let { Banner(it) }
                if (section < sections.lastIndex) PrimaryButton("Next", { section++ }, color = Ez.Emerald, icon = Icons.AutoMirrored.Filled.ArrowForward)
                else PrimaryButton("Generate Agreement", ::generate, loading = loading, color = Ez.Emerald, icon = Icons.Filled.AutoAwesome)
            } else {
                error?.let { Banner(it) }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PrimaryButton("Save PDF", { sharePdf(ctx, d, share = false) }, Modifier.weight(1f), color = Ez.Rose, icon = Icons.Filled.PictureAsPdf)
                    PrimaryButton("Share", { sharePdf(ctx, d, share = true) }, Modifier.weight(1f), color = Ez.Indigo, icon = Icons.Filled.Share)
                }
                GlassCard(Modifier.fillMaxWidth().reveal(), tint = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.85f)) { MarkdownText(d) }
                TextLink("← Edit details", { draft = null; error = null })
                Text("Review carefully and print on stamp paper as required in your state. EzLex drafts are templates, not legal advice.", fontSize = 11.sp, color = Ez.Muted)
            }
        }
    }
}

private fun addr(v: Map<String, String>, p: String) = listOf("${p}Suite", "${p}Address1", "${p}Address2", "${p}Address", "${p}Landmark", "${p}City", "${p}State", "${p}Pincode")
    .mapNotNull { v[it]?.trim()?.ifBlank { null } }.joinToString(", ")

/** Standard Indian residential rental agreement, used offline or when the AI is unavailable. */
private fun buildTemplate(v: Map<String, String>, years: String, months: String): String {
    val today = LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.ENGLISH))
    val term = listOfNotNull(years.takeIf { it != "0" }?.let { "$it year(s)" }, months.takeIf { it != "0" }?.let { "$it month(s)" }).joinToString(" and ").ifBlank { "11 months" }
    return """
# RESIDENTIAL RENTAL AGREEMENT

This Rental Agreement is made and executed on **$today** by and between:

**${v["landlordName"].orEmpty()}**, residing at ${addr(v, "landlord").ifBlank { "[Owner address]" }} (hereinafter called the **"OWNER"**), of the ONE PART;

AND

**${v["tenantName"].orEmpty()}**, residing at ${addr(v, "tenant").ifBlank { "[Tenant address]" }} (hereinafter called the **"TENANT"**), of the OTHER PART.

## Terms and Conditions

1. **Term:** The tenancy shall be for a period of **$term**, commencing from the date of this agreement, renewable by mutual consent.
2. **Rent:** The Tenant shall pay a monthly rent of **₹${v["monthlyRent"].orEmpty()}** on or before the 5th day of every English calendar month.
3. **Security Deposit:** The Tenant has paid **₹${v["securityDeposit"].orEmpty()}** as an interest-free refundable security deposit, refundable on termination after deducting any dues or damages.
4. **Use:** The premises shall be used for residential purposes only and shall not be sublet without the Owner's written consent.
5. **Charges:** Electricity, water and maintenance charges shall be borne by the Tenant as per actual consumption.
6. **Maintenance:** The Tenant shall keep the premises in good condition; minor repairs are the Tenant's responsibility, structural repairs the Owner's.
7. **Notice:** Either party may terminate this agreement by giving **one month's** written notice.
8. **Inspection:** The Owner may inspect the premises at reasonable hours with prior notice.
9. **Handover:** On termination, the Tenant shall hand over vacant and peaceful possession in the same condition, subject to normal wear and tear.

## Schedule of Property

All that piece and parcel of the premises at **${addr(v, "property").ifBlank { "[Property address]" }}**.

IN WITNESS WHEREOF the parties have signed this agreement on the date first written above.

**OWNER:** ______________________        **TENANT:** ______________________

**Witness 1:** ______________________    **Witness 2:** ______________________
""".trim()
}

/** Renders the draft to an A4 PDF and opens or shares it. */
private fun sharePdf(ctx: Context, markdown: String, share: Boolean) {
    val text = markdown.lines().joinToString("\n") { it.replace(Regex("^#+\\s*"), "").replace("**", "").replace(Regex("^[-*]\\s+"), "• ") }
    val doc = PdfDocument()
    val paint = TextPaint().apply { textSize = 10.5f; typeface = Typeface.SERIF; isAntiAlias = true }
    val width = 595 - 2 * 56
    val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, width)
        .setAlignment(Layout.Alignment.ALIGN_NORMAL).setLineSpacing(3f, 1f).build()
    val usable = 842 - 2 * 60
    var line = 0
    var pageNo = 1
    while (line < layout.lineCount) {
        val page = doc.startPage(PdfDocument.PageInfo.Builder(595, 842, pageNo).create())
        val top = layout.getLineTop(line)
        var last = line
        while (last < layout.lineCount && layout.getLineBottom(last) - top <= usable) last++
        page.canvas.save()
        page.canvas.translate(56f, 60f - top)
        page.canvas.clipRect(0, top, width, layout.getLineTop(last))
        layout.draw(page.canvas)
        page.canvas.restore()
        page.canvas.drawText("EzLex · Page $pageNo", 56f, 842f - 28f, TextPaint().apply { textSize = 8f; color = android.graphics.Color.GRAY })
        doc.finishPage(page)
        line = last; pageNo++
    }
    val dir = File(ctx.cacheDir, "documents").apply { mkdirs() }
    val file = File(dir, "EzLex-Rental-Agreement.pdf")
    file.outputStream().use { doc.writeTo(it) }
    doc.close()
    val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.files", file)
    val intent = if (share) Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM, uri)
    else Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf")
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    runCatching { ctx.startActivity(Intent.createChooser(intent, if (share) "Share agreement" else "Open PDF with")) }
}

