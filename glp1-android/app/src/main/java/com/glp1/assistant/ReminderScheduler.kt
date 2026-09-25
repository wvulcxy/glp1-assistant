package com.glp1.assistant

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.Calendar

/**
 * System-level reminder scheduling.
 *
 * The reminder plan is persisted locally and armed via AlarmManager so it fires
 * even when the app (WebView) is closed, the phone is in Doze, or after reboot.
 */
object ReminderScheduler {
    private const val PREFS = "glp1_reminder_prefs"
    private const val KEY_FREQUENCY = "frequency"
    private const val KEY_WEEKDAY = "weekday"
    private const val KEY_TIME = "time"
    private const val KEY_TITLE = "title"
    private const val KEY_BODY = "body"
    private const val KEY_NEXT = "next_trigger"
    private const val KEY_LAST_NOTIFY = "last_notify_ms"

    const val ACTION_SHOW = "com.glp1.assistant.action.SHOW_REMINDER"
    private const val ALARM_REQUEST_CODE = 2001
    private const val NOTIFICATION_ID = 1001
    private const val DAY_MS = 24 * 60 * 60 * 1000L

    private fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Persist the reminder plan and arm the system alarm. */
    @Synchronized
    fun schedule(
        context: Context,
        frequency: String,
        weekday: String,
        time: String,
        title: String,
        body: String,
        nextTimestamp: Long
    ) {
        val appContext = context.applicationContext
        val next = if (nextTimestamp > System.currentTimeMillis()) {
            nextTimestamp
        } else {
            computeNextFrom(frequency, weekday, time, System.currentTimeMillis())
        }
        prefs(appContext).edit()
            .putString(KEY_FREQUENCY, frequency)
            .putString(KEY_WEEKDAY, weekday)
            .putString(KEY_TIME, time)
            .putString(KEY_TITLE, title)
            .putString(KEY_BODY, body)
            .putLong(KEY_NEXT, next)
            .apply()
        setAlarm(appContext, next)
    }

    /** Remove the reminder plan and cancel any pending alarm. */
    @Synchronized
    fun cancel(context: Context) {
        val appContext = context.applicationContext
        val alarmManager = appContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(alarmPendingIntent(appContext))
        prefs(appContext).edit().clear().apply()
    }

    /** Re-arm the stored alarm (used on app start and after reboot / app update). */
    @Synchronized
    fun rescheduleIfNeeded(context: Context) {
        val appContext = context.applicationContext
        val next = prefs(appContext).getLong(KEY_NEXT, 0L)
        if (next == 0L) return
        setAlarm(appContext, next)
    }

    /** Called when the alarm fires: show the notification and arm the next occurrence. */
    @Synchronized
    fun onFired(context: Context) {
        val appContext = context.applicationContext
        val p = prefs(appContext)
        val title = p.getString(KEY_TITLE, "GLP-1 用药提醒") ?: "GLP-1 用药提醒"
        val body = p.getString(KEY_BODY, "该注射了！") ?: "该注射了！"
        showNotification(appContext, title, body)

        val frequency = p.getString(KEY_FREQUENCY, "weekly") ?: "weekly"
        val weekday = p.getString(KEY_WEEKDAY, "1") ?: "1"
        val time = p.getString(KEY_TIME, "08:00") ?: "08:00"
        val last = p.getLong(KEY_NEXT, System.currentTimeMillis())
        val next = computeNextFrom(frequency, weekday, time, last)
        p.edit().putLong(KEY_NEXT, next).apply()
        setAlarm(appContext, next)
    }

    /**
     * De-duplicate notifications coming from both the JS path and the system
     * alarm: only one notification is shown per 5-minute window.
     */
    @Synchronized
    fun shouldSkipDuplicate(context: Context): Boolean {
        val p = prefs(context)
        val last = p.getLong(KEY_LAST_NOTIFY, 0L)
        val now = System.currentTimeMillis()
        if (now - last < 5 * 60 * 1000L) return true
        p.edit().putLong(KEY_LAST_NOTIFY, now).apply()
        return false
    }

    /**
     * Compute the next occurrence at the given weekday / time.
     * Weekday follows the JS convention: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
     */
    fun computeNextFrom(frequency: String, weekday: String, time: String, fromMillis: Long): Long {
        val from = Calendar.getInstance().apply { timeInMillis = fromMillis }
        val cal = Calendar.getInstance().apply { timeInMillis = fromMillis }
        val parts = time.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: 8
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0
        cal.set(Calendar.HOUR_OF_DAY, hour)
        cal.set(Calendar.MINUTE, minute)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)

        if (frequency == "daily") {
            if (!cal.after(from)) cal.add(Calendar.DAY_OF_YEAR, 1)
            return cal.timeInMillis
        }

        // weekly / biweekly: JS 0=Sunday..6=Saturday, Calendar 1=Sunday..7=Saturday
        val target = (weekday.toIntOrNull() ?: 1) + 1
        val current = cal.get(Calendar.DAY_OF_WEEK)
        var daysUntil = target - current
        if (daysUntil < 0) daysUntil += 7
        val period = if (frequency == "biweekly") 14 else 7
        if (daysUntil == 0 && !cal.after(from)) daysUntil = period
        cal.add(Calendar.DAY_OF_YEAR, daysUntil)
        return cal.timeInMillis
    }

    private fun setAlarm(context: Context, triggerAt: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = alarmPendingIntent(context)
        val exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            alarmManager.canScheduleExactAlarms()
        if (exactAllowed) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        } else {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        }
    }

    private fun alarmPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).setAction(ACTION_SHOW)
        return PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun showNotification(context: Context, title: String, body: String) {
        if (!notificationsEnabled(context)) return
        if (shouldSkipDuplicate(context)) return
        val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, MainActivity.CHANNEL_ID)
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
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun notificationsEnabled(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
        } else {
            NotificationManagerCompat.from(context).areNotificationsEnabled()
        }
    }
}

/** Receives the system alarm and shows the reminder. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ReminderScheduler.ACTION_SHOW) {
            ReminderScheduler.onFired(context)
        }
    }
}

/** Re-arms the reminder after reboot or app update. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            ReminderScheduler.rescheduleIfNeeded(context)
        }
    }
}
