package com.ezlex.app

import android.app.Application
import com.ezlex.app.data.Repository
import com.ezlex.app.data.SessionStore

class EzLexApp : Application() {
    lateinit var store: SessionStore
        private set
    lateinit var repo: Repository
        private set

    override fun onCreate() {
        super.onCreate()
        store = SessionStore(this)
        repo = Repository(store)
    }
}
