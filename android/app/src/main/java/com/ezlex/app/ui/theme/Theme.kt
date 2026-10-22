package com.ezlex.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object Ez {
    val Blue = Color(0xFF2563EB)
    val Indigo = Color(0xFF4F46E5)
    val Fuchsia = Color(0xFFC026D3)
    val Emerald = Color(0xFF059669)
    val Amber = Color(0xFFD97706)
    val Rose = Color(0xFFE11D48)
    val Ink = Color(0xFF0F172A)
    val Slate = Color(0xFF475569)
    val Muted = Color(0xFF94A3B8)

    // Liquid glass surfaces
    val Glass = Color.White.copy(alpha = 0.50f)
    val GlassSoft = Color.White.copy(alpha = 0.32f)
    val GlassEdge = Color.White.copy(alpha = 0.85f)
    val GlassEdgeLow = Color.White.copy(alpha = 0.25f)
}

private val Colors = lightColorScheme(
    primary = Ez.Blue,
    onPrimary = Color.White,
    secondary = Ez.Indigo,
    background = Color(0xFFEEF2FF),
    surface = Color.White,
    onSurface = Ez.Ink,
    onBackground = Ez.Ink,
    error = Ez.Rose,
)

private val Type = Typography(
    headlineLarge = TextStyle(fontSize = 30.sp, fontWeight = FontWeight.Black, letterSpacing = (-0.5).sp, color = Ez.Ink),
    headlineSmall = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Ez.Ink),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Ez.Ink),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, color = Ez.Slate),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, color = Ez.Slate),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Ez.Slate),
)

@Composable
fun EzLexTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Colors, typography = Type, content = content)
}
