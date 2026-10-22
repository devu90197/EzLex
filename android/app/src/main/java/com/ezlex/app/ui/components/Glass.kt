package com.ezlex.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.ui.theme.Ez

/** Slowly drifting colour blobs behind every screen — the "liquid" in liquid glass. */
@Composable
fun LiquidBackground(modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    val t = rememberInfiniteTransition(label = "liquid")
    val a by t.animateFloat(0f, 1f, infiniteRepeatable(tween(22000, easing = LinearEasing), RepeatMode.Reverse), label = "a")
    val b by t.animateFloat(0f, 1f, infiniteRepeatable(tween(28000, easing = LinearEasing), RepeatMode.Reverse), label = "b")
    Box(
        modifier
            .fillMaxSize()
            .background(Brush.linearGradient(listOf(Color(0xFFEEF2FF), Color(0xFFE0F2FE), Color(0xFFF5F3FF))))
    ) {
        Canvas(Modifier.fillMaxSize()) {
            fun blob(color: Color, cx: Float, cy: Float, r: Float) =
                drawCircle(Brush.radialGradient(listOf(color.copy(alpha = 0.55f), Color.Transparent), Offset(cx, cy), r), r, Offset(cx, cy))
            val w = size.width; val h = size.height
            blob(Color(0xFF60A5FA), w * (0.05f + 0.35f * a), h * (0.08f + 0.18f * b), w * 0.75f)
            blob(Color(0xFFA78BFA), w * (0.95f - 0.30f * b), h * (0.35f + 0.20f * a), w * 0.70f)
            blob(Color(0xFF22D3EE), w * (0.30f + 0.25f * b), h * (0.92f - 0.25f * a), w * 0.70f)
            blob(Color(0xFFF0ABFC), w * (0.75f - 0.20f * a), h * (0.80f - 0.10f * b), w * 0.45f)
        }
        content()
    }
}

/** Frosted glass panel: translucent fill, bright top edge, soft shadow. */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(24.dp),
    padding: Dp = 16.dp,
    tint: Color = Ez.Glass,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .shadow(14.dp, shape, ambientColor = Color(0x221F2687), spotColor = Color(0x221F2687))
            .clip(shape)
            .background(Brush.verticalGradient(listOf(tint.copy(alpha = (tint.alpha + 0.12f).coerceAtMost(1f)), tint)))
            .border(1.dp, Brush.verticalGradient(listOf(Ez.GlassEdge, Ez.GlassEdgeLow)), shape)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(padding),
        content = content,
    )
}

/** Zoom-in reveal on first appearance (the app's take on the website's cinematic scroll). */
@Composable
fun Modifier.reveal(index: Int = 0): Modifier {
    val p = remember { Animatable(0f) }
    LaunchedEffect(Unit) { p.animateTo(1f, tween(650, delayMillis = 70 * index, easing = FastOutSlowInEasing)) }
    return graphicsLayer {
        alpha = p.value
        val s = 0.86f + 0.14f * p.value
        scaleX = s; scaleY = s
        translationY = (1f - p.value) * 60f
    }
}

@Composable
fun GlassField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
    maxLength: Int = Int.MAX_VALUE,
    digitsOnly: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
    enabled: Boolean = true,
    leading: ImageVector? = null,
    prefix: String? = null,
) {
    var show by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = { v ->
            val f = if (digitsOnly) v.filter(Char::isDigit) else v
            onValueChange(f.take(maxLength))
        },
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = singleLine,
        minLines = minLines,
        enabled = enabled,
        shape = RoundedCornerShape(16.dp),
        prefix = prefix?.let { { Text(it, color = Ez.Slate) } },
        leadingIcon = leading?.let { { Icon(it, null, tint = Ez.Slate) } },
        keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else keyboardType),
        visualTransformation = if (password && !show) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = if (password) {
            { IconButton({ show = !show }) { Icon(if (show) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, if (show) "Hide password" else "Show password") } }
        } else null,
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Color.White.copy(alpha = 0.75f),
            unfocusedContainerColor = Color.White.copy(alpha = 0.45f),
            disabledContainerColor = Color.White.copy(alpha = 0.25f),
            focusedBorderColor = Ez.Blue,
            unfocusedBorderColor = Color.White,
            focusedTextColor = Ez.Ink,
            unfocusedTextColor = Ez.Ink,
        ),
    )
}

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    loading: Boolean = false,
    enabled: Boolean = true,
    color: Color = Ez.Blue,
    icon: ImageVector? = null,
) {
    val active = enabled && !loading
    Row(
        modifier
            .fillMaxWidth()
            .height(52.dp)
            .shadow(if (active) 10.dp else 0.dp, RoundedCornerShape(16.dp), spotColor = color)
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.horizontalGradient(listOf(color, color.copy(red = (color.red * 0.8f), blue = (color.blue * 1.1f).coerceAtMost(1f)))))
            .graphicsLayer { alpha = if (active) 1f else 0.45f }
            .clickable(enabled = active, onClick = onClick),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (loading) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.5.dp)
        else {
            icon?.let { Icon(it, null, tint = Color.White, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)) }
            Text(text, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}

@Composable
fun TextLink(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, color: Color = Ez.Blue) {
    Text(
        text, color = color, fontWeight = FontWeight.SemiBold, fontSize = 13.sp,
        modifier = modifier.clip(RoundedCornerShape(8.dp)).clickable(onClick = onClick).padding(horizontal = 6.dp, vertical = 6.dp),
    )
}

@Composable
fun Banner(text: String, error: Boolean = true) {
    val c = if (error) Ez.Rose else Ez.Emerald
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(c.copy(alpha = 0.10f))
            .border(1.dp, c.copy(alpha = 0.25f), RoundedCornerShape(14.dp)).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.ErrorOutline, null, tint = c, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(text, color = c, fontSize = 13.sp)
    }
}

/** Segmented glass tabs (Sign In / Create Account, filters, etc.) */
@Composable
fun <T> GlassTabs(options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Ez.GlassSoft)
            .border(1.dp, Ez.GlassEdgeLow, RoundedCornerShape(16.dp)).padding(4.dp),
    ) {
        options.forEach { (v, label) ->
            val on = v == selected
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(12.dp))
                    .background(if (on) Color.White.copy(alpha = 0.95f) else Color.Transparent)
                    .clickable { onSelect(v) }.padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (on) Ez.Ink else Ez.Slate, maxLines = 1)
            }
        }
    }
}

@Composable
fun Chip(text: String, selected: Boolean, onClick: () -> Unit, color: Color = Ez.Blue) {
    Box(
        Modifier.clip(RoundedCornerShape(50)).background(if (selected) color else Ez.Glass)
            .border(1.dp, if (selected) color else Ez.GlassEdge, RoundedCornerShape(50))
            .clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Color.White else Ez.Slate)
    }
}

/** Screen chrome: glass top bar with back button, content below. */
@Composable
fun GlassScreen(
    title: String,
    onBack: (() -> Unit)?,
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    LiquidBackground {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().background(Color.White.copy(alpha = 0.55f)).statusBarsPadding()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (onBack != null) IconButton(onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Ez.Ink) }
                else Spacer(Modifier.width(12.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f), maxLines = 1)
                actions()
            }
            Column(Modifier.fillMaxSize(), content = content)
        }
    }
}

@Composable
fun IconBadge(icon: ImageVector, color: Color, size: Dp = 44.dp) {
    Box(
        Modifier.size(size).clip(RoundedCornerShape(14.dp)).background(color.copy(alpha = 0.12f))
            .border(1.dp, Color.White.copy(alpha = 0.7f), RoundedCornerShape(14.dp)),
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, tint = color, modifier = Modifier.size(size * 0.5f)) }
}

@Composable
fun Dot(color: Color) = Box(Modifier.size(8.dp).clip(CircleShape).background(color))

val ScreenPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
