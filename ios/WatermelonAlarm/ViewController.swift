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
        if let soundUrl = Bundle.main.url(forResource: "alarm", withExtension: "wav") {
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
        vibrateTimer = Timer.scheduledTimer(withTimeInterval: 0.8, repeats: true) { _ in
            AudioServicesPlaySystemSound(SystemSoundID(kSystemSoundID_Vibrate))
        }
    }

    func stopAlarmAudio() {
        audioPlayer?.stop()
        audioPlayer = nil
        vibrateTimer?.invalidate()
        vibrateTimer = nil
        
        // 清理所有关联的锁屏连环响铃通知
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
        
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
            
            // 先清理旧的同名通知序列
            var cancelIds: [String] = [id]
            for i in 0..<5 { cancelIds.append("\(id)_\(i)") }
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: cancelIds)
            
            let baseDate = Date(timeIntervalSince1970: timestamp / 1000.0)
            
            // 采用 iOS 连环脉冲通知架构（每隔 15 秒触发一次高音响铃与振动，共持续 1 分多钟）
            for i in 0..<5 {
                let fireDate = baseDate.addingTimeInterval(Double(i * 15))
                guard fireDate.timeIntervalSinceNow > 0 else { continue }
                
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
                
                let reqId = "\(id)_\(i)"
                let req = UNNotificationRequest(identifier: reqId, content: content, trigger: trigger)
                UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
            }
        } else if action == "cancelAlarm" {
            if let id = body["id"] as? String {
                var cancelIds: [String] = [id]
                for i in 0..<5 { cancelIds.append("\(id)_\(i)") }
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: cancelIds)
            }
        } else if action == "stopRing" {
            stopAlarmAudio()
        }
    }
}
