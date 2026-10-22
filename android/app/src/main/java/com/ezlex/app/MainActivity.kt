package com.ezlex.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.ezlex.app.ui.AppNav
import com.ezlex.app.ui.LocalRepo
import com.ezlex.app.ui.LocalStore
import com.ezlex.app.ui.theme.EzLexTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as EzLexApp
        setContent {
            EzLexTheme {
                CompositionLocalProvider(LocalRepo provides app.repo, LocalStore provides app.store) {
                    AppNav()
                }
            }
        }
    }
}
