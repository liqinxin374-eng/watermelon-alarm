package com.alarmclock.alarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

/**
 * 被杀后由 Service 拉起的全屏响铃页（原生实现，保证可靠）。
 * 点击停止：停掉 AlarmService（停止铃声）。
 */
class AlarmRingActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 亮屏与突破锁屏展示
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            km?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        val id = intent.getStringExtra("alarmId") ?: ""
        val tv = TextView(this).apply {
            text = "⏰ 闹钟响铃\n$id"
            textSize = 24f
            gravity = android.view.Gravity.CENTER
        }
        val btn = Button(this).apply {
            text = "停止"
            textSize = 18f
            setOnClickListener {
                stopService(Intent(this@AlarmRingActivity, AlarmService::class.java))
                finish()
            }
        }
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(60, 120, 60, 60)
            addView(tv)
            val spacer = android.view.View(context).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 40
                )
            }
            addView(spacer)
            addView(btn)
        }
        setContentView(layout)
    }
}
