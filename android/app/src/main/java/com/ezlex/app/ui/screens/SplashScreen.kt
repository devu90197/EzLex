package com.ezlex.app.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Balance
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.components.LiquidBackground
import com.ezlex.app.ui.theme.Ez
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

private val Cinematic = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)

@Composable
fun SplashScreen(onSignedIn: () -> Unit, onSignedOut: () -> Unit) {
    val repo = LocalRepo.current
    val zoom = remember { Animatable(1.6f) }
    val fade = remember { Animatable(0f) }
    val tag = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        val session = async { runCatching { repo.validSession() }.getOrNull() }
        launch { fade.animateTo(1f, tween(900)) }
        launch { zoom.animateTo(1f, tween(1500, easing = Cinematic)) }
        tag.animateTo(1f, tween(700, delayMillis = 800))
        kotlinx.coroutines.delay(500)
        if (session.await() != null) onSignedIn() else onSignedOut()
    }

    LiquidBackground {
        Column(
            Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                Modifier
                    .graphicsLayer { alpha = fade.value; scaleX = zoom.value; scaleY = zoom.value }
                    .shadow(24.dp, RoundedCornerShape(28.dp), spotColor = Ez.Indigo)
                    .size(96.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(Brush.linearGradient(listOf(Ez.Blue, Ez.Indigo, Ez.Fuchsia)))
                    .border(1.5.dp, Color.White.copy(alpha = 0.6f), RoundedCornerShape(28.dp)),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Balance, null, tint = Color.White, modifier = Modifier.size(52.dp)) }

            Spacer(Modifier.height(24.dp))
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(color = Ez.Ink)) { append("Ez") }
                    withStyle(SpanStyle(brush = Brush.horizontalGradient(listOf(Ez.Blue, Ez.Indigo, Ez.Fuchsia)))) { append("Lex") }
                },
                fontSize = 48.sp, fontWeight = FontWeight.Black, letterSpacing = (-1).sp,
                modifier = Modifier.graphicsLayer { alpha = fade.value; scaleX = zoom.value; scaleY = zoom.value },
            )
            Text(
                "AI-powered justice for every citizen",
                fontSize = 15.sp, color = Ez.Slate,
                modifier = Modifier.padding(top = 8.dp).graphicsLayer { alpha = tag.value; translationY = (1 - tag.value) * 20f },
            )
        }
        Text(
            "Powered by BNS & Indian Legal Framework",
            fontSize = 11.sp, color = Ez.Muted, letterSpacing = 1.sp,
            modifier = Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 24.dp).graphicsLayer { alpha = tag.value },
        )
    }
}
