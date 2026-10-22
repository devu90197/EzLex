package com.ezlex.app.ui

import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ezlex.app.data.Repository
import com.ezlex.app.data.SessionStore
import com.ezlex.app.ui.screens.AuthScreen
import com.ezlex.app.ui.screens.CasesScreen
import com.ezlex.app.ui.screens.ChatScreen
import com.ezlex.app.ui.screens.DraftScreen
import com.ezlex.app.ui.screens.HelpScreen
import com.ezlex.app.ui.screens.HistoryScreen
import com.ezlex.app.ui.screens.HomeScreen
import com.ezlex.app.ui.screens.PrivacyScreen
import com.ezlex.app.ui.screens.ProfileScreen
import com.ezlex.app.ui.screens.RightsScreen
import com.ezlex.app.ui.screens.SplashScreen

val LocalRepo = staticCompositionLocalOf<Repository> { error("Repository not provided") }
val LocalStore = staticCompositionLocalOf<SessionStore> { error("SessionStore not provided") }

object Routes {
    const val SPLASH = "splash"
    const val AUTH = "auth"
    const val HOME = "home"
    const val RIGHTS = "rights"
    const val CHAT = "chat"
    const val CASES = "cases"
    const val DRAFT = "draft"
    const val HISTORY = "history"
    const val HELP = "help"
    const val PROFILE = "profile"
    const val PRIVACY = "privacy"

    /** Feature screens can reopen a saved activity: "cases?aid=<id>" */
    fun withAid(route: String, aid: String?) = if (aid == null) route else "$route?aid=$aid"
}

@Composable
fun AppNav(nav: NavHostController = rememberNavController()) {
    NavHost(
        nav, startDestination = Routes.SPLASH,
        // Cinematic zoom between screens
        enterTransition = { fadeIn(tween(380)) + scaleIn(tween(420), initialScale = 0.92f) },
        exitTransition = { fadeOut(tween(250)) + scaleOut(tween(380), targetScale = 1.06f) },
        popEnterTransition = { fadeIn(tween(380)) + scaleIn(tween(420), initialScale = 1.06f) },
        popExitTransition = { fadeOut(tween(250)) + scaleOut(tween(380), targetScale = 0.92f) },
    ) {
        val back: () -> Unit = { nav.popBackStack() }
        fun goHome() = nav.navigate(Routes.HOME) { popUpTo(0) { inclusive = true } }
        fun goAuth() = nav.navigate(Routes.AUTH) { popUpTo(0) { inclusive = true } }

        composable(Routes.SPLASH) { SplashScreen(onSignedIn = ::goHome, onSignedOut = ::goAuth) }
        composable(Routes.AUTH) { AuthScreen(onDone = ::goHome, onPrivacy = { nav.navigate(Routes.PRIVACY) }) }
        composable(Routes.HOME) { HomeScreen(navigate = { nav.navigate(it) }, onSignedOut = ::goAuth) }
        composable(Routes.HISTORY) { HistoryScreen(onBack = back, open = { nav.navigate(it) }) }
        composable(Routes.HELP) { HelpScreen(onBack = back) }
        composable(Routes.PROFILE) { ProfileScreen(onBack = back, onSignedOut = ::goAuth, onPrivacy = { nav.navigate(Routes.PRIVACY) }) }
        composable(Routes.PRIVACY) { PrivacyScreen(onBack = back) }

        val aidArg = listOf(navArgument("aid") { type = NavType.StringType; nullable = true; defaultValue = null })
        composable("${Routes.RIGHTS}?aid={aid}", aidArg) { RightsScreen(it.arguments?.getString("aid"), back) }
        composable("${Routes.CHAT}?aid={aid}", aidArg) { ChatScreen(it.arguments?.getString("aid"), back) }
        composable("${Routes.CASES}?aid={aid}", aidArg) { CasesScreen(it.arguments?.getString("aid"), back) }
        composable("${Routes.DRAFT}?aid={aid}", aidArg) { DraftScreen(it.arguments?.getString("aid"), back) }
    }
}
