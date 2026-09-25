package com.glp1.assistant

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

class MainActivity : Activity() {
    companion object {
        const val CHANNEL_ID = "glp1_reminder"
        const val REQ_NOTIFICATION_PERMISSION = 1001
        const val REQ_LOCATION_PERMISSION = 1002
        var NOTIFY_ID = 0
    }

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Create notification channel
        createNotificationChannel()

        // Status bar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = Color.TRANSPARENT
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }

        webView = WebView(this)
        webView.setBackgroundColor(0xFFF5F7FA.toInt())
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        @Suppress("DEPRECATION")
        webView.settings.setGeolocationEnabled(true)
        webView.webViewClient = WebViewClient()
        // Allow the web page to use GPS for the fun "food delivery" simulation
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback
            ) {
                callback.invoke(origin, true, false)
            }
        }

        // Inject bridge: window.Android.postMessage(json)
        webView.addJavascriptInterface(NotificationBridge(this), "Android")

        webView.loadUrl("file:///android_asset/index.html")

        // Request notification permission on Android 13+ (also re-triggered by UI)
        requestNotificationPermissionIfNeeded()

        // Re-arm the system alarm from a previously saved reminder plan
        ReminderScheduler.rescheduleIfNeeded(this)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_NOTIFICATION_PERMISSION) {
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
                ReminderScheduler.rescheduleIfNeeded(this)
            }
            runOnUiThread {
                webView.evaluateJavascript(
                    "if (window.updateNotifyStatus) updateNotifyStatus();", null
                )
            }
        }
        if (requestCode == REQ_LOCATION_PERMISSION) {
            val granted = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
            runOnUiThread {
                webView.evaluateJavascript(
                    "window.onLocationPermissionResult && window.onLocationPermissionResult($granted);", null
                )
            }
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQ_NOTIFICATION_PERMISSION
            )
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "用药提醒",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "GLP-1注射提醒通知"
                enableVibration(true)
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    inner class NotificationBridge(private val context: Context) {
        @JavascriptInterface
        fun postMessage(json: String) {
            try {
                val msg = JSONObject(json)
                when (msg.optString("action")) {
                    "requestPermission" -> requestNotificationPermission()
                    "schedule" -> showNotification(
                        msg.optString("title", "GLP-1 用药提醒"),
                        msg.optString("body", "该注射了！")
                    )
                    "scheduleReminder" -> ReminderScheduler.schedule(
                        context,
                        msg.optString("frequency", "weekly"),
                        msg.optString("weekday", "1"),
                        msg.optString("time", "08:00"),
                        msg.optString("title", "GLP-1 用药提醒"),
                        msg.optString("body", "该注射了！"),
                        msg.optLong("nextTimestamp", 0L)
                    )
                    "cancelReminder" -> ReminderScheduler.cancel(context)
                }
            } catch (e: Exception) {
                android.util.Log.e("GLP1", "Bridge error", e)
            }
        }

        @JavascriptInterface
        fun notificationsEnabled(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                    PackageManager.PERMISSION_GRANTED &&
                    NotificationManagerCompat.from(context).areNotificationsEnabled()
            } else {
                NotificationManagerCompat.from(context).areNotificationsEnabled()
            }
        }

        @JavascriptInterface
        fun exactAlarmsAllowed(): Boolean {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            return am.canScheduleExactAlarms()
        }

        @JavascriptInterface
        fun requestExactAlarm() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try {
                    startActivity(
                        Intent(
                            Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                            Uri.parse("package:$packageName")
                        )
                    )
                } catch (e: Exception) {
                    android.util.Log.e("GLP1", "Exact alarm settings error", e)
                }
            }
        }

        @JavascriptInterface
        fun requestLocationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissions(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    ),
                    REQ_LOCATION_PERMISSION
                )
            } else {
                runOnUiThread {
                    webView.evaluateJavascript(
                        "window.onLocationPermissionResult && window.onLocationPermissionResult(true);", null
                    )
                }
            }
        }

        @JavascriptInterface
        fun hasLocationPermission(): Boolean {
            return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        }

        @JavascriptInterface
        fun openNotificationSettings() {
            try {
                startActivity(
                    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                )
            } catch (e: Exception) {
                try {
                    startActivity(
                        Intent(
                            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:$packageName")
                        )
                    )
                } catch (e2: Exception) {
                    android.util.Log.e("GLP1", "Notification settings error", e2)
                }
            }
        }

        private fun requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestNotificationPermissionIfNeeded()
            } else {
                runOnUiThread {
                    webView.evaluateJavascript(
                        "if (window.updateNotifyStatus) updateNotifyStatus();", null
                    )
                }
            }
        }

        /** Show notification immediately — JS already handles timing */
        private fun showNotification(title: String, body: String) {
            try {
                if (!notificationsEnabled()) return
                if (ReminderScheduler.shouldSkipDuplicate(context)) return
                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val contentIntent = PendingIntent.getActivity(
                    context,
                    0,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setContentIntent(contentIntent)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setAutoCancel(true)
                    .setVibrate(longArrayOf(0, 300, 200, 300))
                    .build()
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.notify(NOTIFY_ID++, notification)
            } catch (e: Exception) {
                android.util.Log.e("GLP1", "Notify error", e)
            }
        }
    }
}
