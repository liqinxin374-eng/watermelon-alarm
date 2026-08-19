import UIKit
import UserNotifications
import AVFoundation

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var window: UIWindow?
    var viewController: ViewController?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // 配置音频会话：支持静音模式下响铃与后台播放
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("AudioSession configuration error: \(error)")
        }

        UNUserNotificationCenter.current().delegate = self
        
        // 注册闹钟通知类别与交互按钮
        let stopAction = UNNotificationAction(identifier: "STOP_ACTION", title: "停止响铃 ⏰", options: [.foreground])
        let snoozeAction = UNNotificationAction(identifier: "SNOOZE_ACTION", title: "稍后提醒 💤", options: [])
        let alarmCategory = UNNotificationCategory(
            identifier: "ALARM_CATEGORY",
            actions: [stopAction, snoozeAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        UNUserNotificationCenter.current().setNotificationCategories([alarmCategory])

        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge, .criticalAlert]) { granted, error in
            print("Notification permission granted: \(granted)")
        }
        
        let vc = ViewController()
        self.viewController = vc
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = vc
        window?.makeKeyAndVisible()
        return true
    }

    // 前台收到通知时直接触发响铃界面
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let identifier = notification.request.identifier
        let label = notification.request.content.title
        viewController?.triggerAlarmFromNotification(id: identifier, label: label)
        
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge, .list])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    // 点击通知横幅或锁屏交互按钮时拉起 App 并进入全屏响铃
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let identifier = response.notification.request.identifier
        let label = response.notification.request.content.title
        
        if response.actionIdentifier == "STOP_ACTION" {
            viewController?.stopAlarmAudio()
        } else {
            viewController?.triggerAlarmFromNotification(id: identifier, label: label)
        }
        completionHandler()
    }
}
