import UIKit
import WebKit
import UserNotifications

class ViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "iOSAlarm")
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)
        
        if let htmlPath = Bundle.main.path(forResource: "index", ofType: "html") {
            let url = URL(fileURLWithPath: htmlPath)
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        let action = body["action"] as? String
        
        if action == "setAlarm" {
            guard let id = body["id"] as? String,
                  let timestamp = body["timestamp"] as? Double,
                  let label = body["label"] as? String else { return }
            
            let content = UNMutableNotificationContent()
            content.title = "西瓜闹钟 🍉"
            content.body = "\(label) · 时间到了！"
            content.sound = UNNotificationSound(named: UNNotificationSoundName("default.wav"))
            
            let fireDate = Date(timeIntervalSince1970: timestamp / 1000.0)
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: fireDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            
            let req = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(req)
        } else if action == "cancelAlarm" {
            if let id = body["id"] as? String {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
            }
        }
    }
}
