package com.ezlex.app.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Balance
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.data.ApiException
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.components.Banner
import com.ezlex.app.ui.components.GlassCard
import com.ezlex.app.ui.components.GlassField
import com.ezlex.app.ui.components.GlassTabs
import com.ezlex.app.ui.components.LiquidBackground
import com.ezlex.app.ui.components.PrimaryButton
import com.ezlex.app.ui.components.TextLink
import com.ezlex.app.ui.components.reveal
import com.ezlex.app.ui.theme.Ez
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class Mode { LOGIN, REGISTER }
private enum class Step { FORM, OTP, FORGOT_EMAIL, FORGOT_OTP, FORGOT_PASSWORD, FORGOT_DONE, REG_OTP, REG_DONE }
private enum class Method { PASSWORD, EMAIL_OTP }

private data class Role(val id: String, val label: String, val icon: ImageVector, val color: Color)

private val roles = listOf(
    Role("CITIZEN", "Citizen", Icons.Filled.Person, Ez.Blue),
    Role("VERIFIED_LAWYER", "Lawyer", Icons.Filled.Work, Ez.Amber),
    Role("GOVT_AUTHORITY", "Authority", Icons.Filled.AccountBalance, Ez.Emerald),
    Role("NGO_LEGAL_AID", "NGO / Aid", Icons.Filled.VolunteerActivism, Color(0xFF9333EA)),
)

@Composable
private fun rememberCountdown(): Pair<Int, (Int) -> Unit> {
    var left by remember { mutableIntStateOf(0) }
    var startToken by remember { mutableIntStateOf(0) }
    LaunchedEffect(startToken) {
        while (left > 0) { delay(1000); left-- }
    }
    return left to { secs: Int -> left = secs; startToken++ }
}

@Composable
fun AuthScreen(onDone: () -> Unit, onPrivacy: () -> Unit) {
    val repo = LocalRepo.current
    val scope = rememberCoroutineScope()

    var mode by rememberSaveable { mutableStateOf(Mode.LOGIN) }
    var step by rememberSaveable { mutableStateOf(Step.FORM) }
    var method by rememberSaveable { mutableStateOf(Method.PASSWORD) }
    var role by rememberSaveable { mutableStateOf("CITIZEN") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var otp by rememberSaveable { mutableStateOf("") }
    var fullName by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var officialId by rememberSaveable { mutableStateOf("") }
    var newPass by rememberSaveable { mutableStateOf("") }
    var confirmPass by rememberSaveable { mutableStateOf("") }
    var agreed by rememberSaveable { mutableStateOf(false) }
    val (timer, startTimer) = rememberCountdown()

    fun run(block: suspend () -> Unit) {
        error = null; loading = true
        scope.launch {
            try { block() } catch (e: ApiException) { error = e.message } catch (e: Exception) { error = "Something went wrong. Please try again." }
            finally { loading = false }
        }
    }
    fun go(s: Step) { error = null; step = s }
    val emailOk = android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()

    LiquidBackground {
        Column(
            Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding()
                .verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 12.dp).reveal()) {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(Ez.Blue), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Balance, null, tint = Color.White, modifier = Modifier.size(24.dp))
                }
                Spacer(Modifier.width(10.dp))
                Text("EzLex ", fontSize = 24.sp, fontWeight = FontWeight.Black, color = Ez.Ink)
                Text("Citizen", fontSize = 24.sp, fontWeight = FontWeight.Black, color = Ez.Blue)
            }

            GlassCard(Modifier.widthIn(max = 480.dp).fillMaxWidth().reveal(1), padding = 18.dp) {
                if (step == Step.FORM) {
                    GlassTabs(
                        listOf(Mode.LOGIN to "Sign In", Mode.REGISTER to "Create Account"), mode,
                        { mode = it; error = null },
                    )
                    Spacer(Modifier.height(14.dp))
                    RolePicker(role) { role = it }
                    Spacer(Modifier.height(14.dp))
                }

                AnimatedContent(
                    targetState = mode to step,
                    transitionSpec = { (fadeIn() + slideInHorizontally { it / 6 }) togetherWith fadeOut() },
                    label = "auth",
                ) { (m, s) ->
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        when {
                            // ───────── Sign in ─────────
                            m == Mode.LOGIN && s == Step.FORM -> {
                                GlassTabs(listOf(Method.PASSWORD to "Password", Method.EMAIL_OTP to "Email OTP"), method, { method = it; error = null })
                                GlassField(email, { email = it }, "Email address", keyboardType = KeyboardType.Email, leading = Icons.Filled.Email)
                                if (method == Method.PASSWORD) {
                                    GlassField(password, { password = it }, "Password", password = true, leading = Icons.Filled.Lock)
                                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                                        TextLink("Forgot password?", { go(Step.FORGOT_EMAIL) })
                                    }
                                }
                                error?.let { Banner(it) }
                                if (method == Method.PASSWORD) {
                                    PrimaryButton("Sign In Securely", {
                                        run { repo.loginWithPassword(email, password); onDone() }
                                    }, loading = loading, enabled = emailOk && password.isNotEmpty())
                                } else {
                                    PrimaryButton("Send Email OTP", {
                                        run { repo.sendEmailOtp(email, flow = "login"); otp = ""; startTimer(60); go(Step.OTP) }
                                    }, loading = loading, enabled = emailOk)
                                }
                            }

                            m == Mode.LOGIN && s == Step.OTP -> {
                                StepHeader(Icons.Filled.Email, "Enter your OTP", "Code sent to $email")
                                TimerText(timer)
                                GlassField(otp, { otp = it }, "6-digit code", keyboardType = KeyboardType.NumberPassword, digitsOnly = true, maxLength = 6)
                                error?.let { Banner(it) }
                                PrimaryButton("Verify & Sign In", {
                                    run { repo.verifyEmailOtp(email, otp, signIn = true); onDone() }
                                }, loading = loading, enabled = otp.length == 6 && timer > 0)
                                TextLink("← Change method", { go(Step.FORM) }, Modifier.align(Alignment.CenterHorizontally), Ez.Slate)
                            }

                            // ───────── Forgot password ─────────
                            s == Step.FORGOT_EMAIL || s == Step.FORGOT_OTP || s == Step.FORGOT_PASSWORD -> {
                                Progress(listOf(Step.FORGOT_EMAIL, Step.FORGOT_OTP, Step.FORGOT_PASSWORD).indexOf(s))
                                when (s) {
                                    Step.FORGOT_EMAIL -> {
                                        StepHeader(Icons.Filled.Key, "Forgot your password?", "We'll email a verification code to reset it.")
                                        GlassField(email, { email = it }, "Registered email address", keyboardType = KeyboardType.Email, leading = Icons.Filled.Email)
                                        error?.let { Banner(it) }
                                        PrimaryButton("Send Verification Code", {
                                            run { repo.sendEmailOtp(email, flow = "reset"); otp = ""; startTimer(600); go(Step.FORGOT_OTP) }
                                        }, loading = loading, enabled = emailOk)
                                    }
                                    Step.FORGOT_OTP -> {
                                        StepHeader(Icons.Filled.Email, "Verify your email", "Code sent to $email")
                                        TimerText(timer)
                                        GlassField(otp, { otp = it }, "6-digit code", keyboardType = KeyboardType.NumberPassword, digitsOnly = true, maxLength = 6)
                                        error?.let { Banner(it) }
                                        PrimaryButton("Verify Email", {
                                            run { repo.verifyResetCode(email, otp); go(Step.FORGOT_PASSWORD) }
                                        }, loading = loading, enabled = otp.length == 6 && timer > 0)
                                        TextLink("Resend code", {
                                            run { repo.sendEmailOtp(email, flow = "reset"); otp = ""; startTimer(600) }
                                        }, Modifier.align(Alignment.CenterHorizontally))
                                    }
                                    else -> {
                                        StepHeader(Icons.Filled.CheckCircle, "Email verified", "Choose a new password (min. 8 characters).", Ez.Emerald)
                                        GlassField(newPass, { newPass = it }, "New password", password = true, leading = Icons.Filled.Lock)
                                        GlassField(confirmPass, { confirmPass = it }, "Confirm new password", password = true, leading = Icons.Filled.Lock)
                                        error?.let { Banner(it) }
                                        PrimaryButton("Reset Password", {
                                            when {
                                                newPass.length < 8 -> error = "Password must be at least 8 characters."
                                                newPass != confirmPass -> error = "Passwords do not match."
                                                else -> run {
                                                    repo.resetPassword(email, otp, newPass)
                                                    newPass = ""; confirmPass = ""; password = ""
                                                    go(Step.FORGOT_DONE)
                                                }
                                            }
                                        }, loading = loading)
                                    }
                                }
                                TextLink("← Back to sign in", { go(Step.FORM) }, Modifier.align(Alignment.CenterHorizontally), Ez.Slate)
                            }

                            s == Step.FORGOT_DONE -> {
                                Done("Password reset!", "Sign in with your new password.")
                                PrimaryButton("Back to Sign In", { method = Method.PASSWORD; go(Step.FORM) })
                            }

                            // ───────── Create account ─────────
                            m == Mode.REGISTER && s == Step.FORM -> {
                                GlassField(fullName, { fullName = it }, "Full name", leading = Icons.Filled.Person, maxLength = 80)
                                GlassField(email, { email = it }, "Email address", keyboardType = KeyboardType.Email, leading = Icons.Filled.Email)
                                GlassField(phone, { phone = it }, "Mobile number", keyboardType = KeyboardType.Phone, digitsOnly = true, maxLength = 10, prefix = "+91 ", leading = Icons.Filled.Phone)
                                GlassField(password, { password = it }, "Create password (min. 8)", password = true, leading = Icons.Filled.Lock)
                                if (role != "CITIZEN") {
                                    GlassField(officialId, { officialId = it }, if (role == "VERIFIED_LAWYER") "Bar Council ID" else "Official / Registration ID", maxLength = 40)
                                }
                                Row(
                                    Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { agreed = !agreed }.padding(4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    androidx.compose.material3.Checkbox(agreed, { agreed = it })
                                    Text("I agree to the ", fontSize = 12.sp, color = Ez.Slate)
                                    TextLink("Privacy Policy", onPrivacy)
                                }
                                error?.let { Banner(it) }
                                PrimaryButton("Verify Email & Continue", {
                                    when {
                                        fullName.isBlank() -> error = "Enter your full name."
                                        phone.length != 10 -> error = "Enter a valid 10-digit mobile number."
                                        password.length < 8 -> error = "Password must be at least 8 characters."
                                        else -> run {
                                            repo.checkDuplicate(email, phone)?.let { throw ApiException(it) }
                                            repo.sendEmailOtp(email, fullName, flow = "register")
                                            otp = ""; startTimer(60); go(Step.REG_OTP)
                                        }
                                    }
                                }, loading = loading, enabled = emailOk && agreed)
                            }

                            s == Step.REG_OTP -> {
                                StepHeader(Icons.Filled.Email, "Verify your email", "Code sent to $email")
                                TimerText(timer)
                                GlassField(otp, { otp = it }, "6-digit code", keyboardType = KeyboardType.NumberPassword, digitsOnly = true, maxLength = 6)
                                error?.let { Banner(it) }
                                PrimaryButton("Verify & Create Account", {
                                    run {
                                        repo.verifyEmailOtp(email, otp, signIn = false)
                                        repo.register(fullName, email, phone, password, role, officialId)
                                        repo.loginWithPassword(email, password)
                                        go(Step.REG_DONE)
                                    }
                                }, loading = loading, enabled = otp.length == 6 && timer > 0)
                                TextLink("← Change details", { go(Step.FORM) }, Modifier.align(Alignment.CenterHorizontally), Ez.Slate)
                            }

                            s == Step.REG_DONE -> {
                                Done("Welcome to EzLex!", "Your account is ready.")
                                PrimaryButton("Get Started", onDone)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Lock, null, tint = Ez.Muted, modifier = Modifier.size(12.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Encrypted connection · Indian IT Act 2000 compliant", fontSize = 11.sp, color = Ez.Muted)
                }
            }

            if (step == Step.FORM) {
                Row(Modifier.padding(top = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (mode == Mode.LOGIN) "Don't have an account?" else "Already have an account?", fontSize = 13.sp, color = Ez.Slate)
                    TextLink(if (mode == Mode.LOGIN) "Create one free" else "Sign in", { mode = if (mode == Mode.LOGIN) Mode.REGISTER else Mode.LOGIN; error = null })
                }
            }
            TextLink("Privacy Policy", onPrivacy, color = Ez.Slate)
        }
    }
}

@Composable
private fun RolePicker(selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        roles.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { r ->
                    val on = r.id == selected
                    Row(
                        Modifier.weight(1f).clip(RoundedCornerShape(14.dp))
                            .background(if (on) Color.White.copy(alpha = 0.9f) else Color.White.copy(alpha = 0.35f))
                            .border(if (on) 2.dp else 1.dp, if (on) r.color else Color.White.copy(alpha = 0.7f), RoundedCornerShape(14.dp))
                            .clickable { onSelect(r.id) }.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(28.dp).clip(RoundedCornerShape(8.dp)).background(if (on) r.color else r.color.copy(alpha = 0.12f)),
                            contentAlignment = Alignment.Center,
                        ) { Icon(r.icon, null, tint = if (on) Color.White else r.color, modifier = Modifier.size(16.dp)) }
                        Spacer(Modifier.width(8.dp))
                        Text(r.label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (on) r.color else Ez.Slate)
                    }
                }
            }
        }
    }
}

@Composable
private fun StepHeader(icon: ImageVector, title: String, subtitle: String, color: Color = Ez.Blue) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(color.copy(alpha = 0.08f))
            .border(1.dp, color.copy(alpha = 0.18f), RoundedCornerShape(16.dp)).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ez.Ink)
            Text(subtitle, fontSize = 12.sp, color = Ez.Slate)
        }
    }
}

@Composable
private fun TimerText(seconds: Int) {
    val text = if (seconds > 0) "Code expires in ${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}" else "Code expired — request a new one"
    Text(text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (seconds > 0) Ez.Amber else Ez.Rose)
}

@Composable
private fun Progress(index: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(3) { i ->
            Box(Modifier.weight(1f).height(5.dp).clip(RoundedCornerShape(50)).background(if (i <= index) Ez.Blue else Color.White.copy(alpha = 0.6f)))
        }
    }
}

@Composable
private fun Done(title: String, subtitle: String) {
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(Icons.Filled.CheckCircle, null, tint = Ez.Emerald, modifier = Modifier.size(56.dp))
        Spacer(Modifier.height(8.dp))
        Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Ez.Ink)
        Text(subtitle, fontSize = 13.sp, color = Ez.Slate, textAlign = TextAlign.Center)
    }
}
