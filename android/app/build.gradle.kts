import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Public client config comes from the web app's env file so both stay in sync.
val webEnv = Properties().apply {
    val f = rootProject.file("../web/.env.local")
    if (f.exists()) f.readLines().forEach { line ->
        val i = line.indexOf('=')
        if (i > 0 && !line.trimStart().startsWith("#")) setProperty(line.substring(0, i).trim(), line.substring(i + 1).trim())
    }
}
val apiUrl = (project.findProperty("EZLEX_API_URL") as String?) ?: "http://10.0.2.2:3000"
val supabaseUrl = webEnv.getProperty("NEXT_PUBLIC_SUPABASE_URL") ?: error("NEXT_PUBLIC_SUPABASE_URL missing in web/.env.local")
val supabaseAnon = webEnv.getProperty("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?: error("NEXT_PUBLIC_SUPABASE_ANON_KEY missing in web/.env.local")

val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "com.ezlex.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.ezlex.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField("String", "API_URL", "\"$apiUrl\"")
        buildConfigField("String", "SUPABASE_URL", "\"$supabaseUrl\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"$supabaseAnon\"")
        // Plain HTTP is only allowed when the configured backend itself is HTTP (local testing)
        manifestPlaceholders["cleartext"] = apiUrl.startsWith("http://").toString()
    }

    signingConfigs {
        if (keystoreProps.getProperty("storeFile") != null) {
            create("release") {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true // java.time on Android 7.x
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

kotlin { jvmToolchain(17) }

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.06.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.1")
    implementation("androidx.navigation:navigation-compose:2.9.0")
    implementation("androidx.datastore:datastore-preferences:1.1.7")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    debugImplementation("androidx.compose.ui:ui-tooling")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}
