import UIKit
import WebKit
import UserNotifications
import AVFoundation
import AudioToolbox

class ViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!
    var audioPlayer: AVAudioPlayer?
    var vibrateTimer: Timer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(self, name: "iOSAlarm")
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(webView)
        
        if let htmlPath = Bundle.main.path(forResource: "index", ofType: "html") {
            let url = URL(fileURLWithPath: htmlPath)
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    func triggerAlarmFromNotification(id: String, label: String) {
        startAlarmAudio()
        let js = "if (typeof ring === 'function') { ring({ id: '\(id)', label: '\(label)', fireAt: Date.now() }); }"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    func startAlarmAudio() {
        if audioPlayer == nil, let soundUrl = Bundle.main.url(forResource: "alarm", withExtension: "wav") {
            do {
                audioPlayer = try AVAudioPlayer(contentsOf: soundUrl)
                audioPlayer?.numberOfLoops = -1
                audioPlayer?.volume = 1.0
                audioPlayer?.play()
            } catch {
                print("Failed to play sound: \(error)")
            }
        }
        
        vibrateTimer?.invalidate()
        vibrateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            AudioServicesPlaySystemSound(SystemSoundID(kSystemSoundID_Vibrate))
        }
    }

    func stopAlarmAudio() {
        audioPlayer?.stop()
        audioPlayer = nil
        vibrateTimer?.invalidate()
        vibrateTimer = nil
        
        // 彻底清空所有残留锁屏通知与角标
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
        UIApplication.shared.applicationIconBadgeNumber = 0
        
        let js = "if (typeof dismissAlarm === 'function') { dismissAlarm(); }"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        let action = body["action"] as? String
        
        if action == "setAlarm" {
            guard let id = body["id"] as? String,
                  let timestamp = body["timestamp"] as? Double,
                  let label = body["label"] as? String else { return }
            
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
            
            let fireDate = Date(timeIntervalSince1970: timestamp / 1000.0)
            guard fireDate.timeIntervalSinceNow > 0 else { return }
            
            let content = UNMutableNotificationContent()
            content.title = "⏰ 西瓜闹钟 · 正在响铃！"
            content.body = "\(label) · 请起床/开始行动！"
            content.sound = UNNotificationSound(named: UNNotificationSoundName("alarm.wav"))
            content.categoryIdentifier = "ALARM_CATEGORY"
            
            if #available(iOS 15.0, *) {
                content.interruptionLevel = .timeSensitive
            }
            
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: fireDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            
            let req = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
            
        } else if action == "cancelAlarm" {
            if let id = body["id"] as? String {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
            }
        } else if action == "stopRing" {
            stopAlarmAudio()
        }
    }
}
