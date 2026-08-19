package com.alarmclock.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.media.MediaPlayer
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.alarmclock.R

/**
 * 前台 Service：播放本地铃声（res/raw 下自定义音频），支持循环直到用户停止。
 * 同时向 JS 层发送 onAlarmFired 事件以拉起响铃页。
 */
class AlarmService : Service() {
    private var player: MediaPlayer? = null

    override fun onCreate() {
        super.onCreate()
        val ch = NotificationChannel("alarm", "闹钟", NotificationManager.IMPORTANCE_HIGH)
        getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val alarmId = intent?.getStringExtra("alarmId") ?: ""
        val notification: Notification = NotificationCompat.Builder(this, "alarm")
            .setContentTitle("闹钟响铃")
            .setContentText("点击停止")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .build()
        startForeground(1, notification)

        // 播放 res/raw 下铃声（示例：alarm_sound.mp3）
        player = MediaPlayer.create(this, R.raw.alarm_sound)?.apply {
            isLooping = true
            start()
        }

        // App 在前台时由 JS 层 onFired 拉起响铃页；被杀时拉起原生全屏 Activity
        val ring = Intent(this, AlarmRingActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("alarmId", alarmId)
        }
        startActivity(ring)

        return START_STICKY
    }

    override fun onDestroy() {
        player?.stop()
        player?.release()
        player = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
