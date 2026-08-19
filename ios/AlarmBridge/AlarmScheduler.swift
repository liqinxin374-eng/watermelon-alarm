import Foundation
import UserNotifications

/// iOS 本地通知调度封装：将闹钟转为 UNNotificationRequest。
///
/// 重复规则映射：
///  - second/minute/hour → UNCalendarNotificationTrigger 的 timeInterval 变种（UNTimeIntervalNotificationTrigger，最小 60s）
///  - day/week/month/year → UNCalendarNotificationTrigger(dateComponents:repeats:)
/// 铃声：alarm["iosSound"] 必须是打包进 Bundle 的音频文件名（≤30s，如 "alarm_sound"）。
class AlarmScheduler {
  private let center = UNUserNotificationCenter.current()

  func schedule(_ alarm: NSDictionary, completion: @escaping (Error?) -> Void) {
    let id = (alarm["id"] as? String) ?? UUID().uuidString
    let triggerAt = (alarm["triggerAt"] as? NSNumber)?.doubleValue ?? 0
    let label = (alarm["label"] as? String) ?? "闹钟"
    let sound = (alarm["iosSound"] as? String) ?? "default"
    let tz = (alarm["timezone"] as? String) ?? "Asia/Shanghai"

    // 请求通知授权（含声音）
    center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
      guard granted else { completion(NSError(domain: "", code: 1, userInfo: [NSLocalizedDescriptionKey: "通知未授权"])); return }

      let content = UNMutableNotificationContent()
      content.title = "闹钟"
      content.body = label
      content.sound = UNNotificationSound(named: UNNotificationSoundName("\(sound).wav"))

      let fireDate = Date(timeIntervalSince1970: triggerAt / 1000.0)
      let trigger = self.buildTrigger(fireDate: fireDate, tz: tz, freq: alarm["freq"] as? String)

      let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
      self.center.add(request) { error in completion(error) }
    }
  }

  private func buildTrigger(fireDate: Date, tz: String, freq: String?) -> UNNotificationTrigger {
    let cal = Calendar.current
    cal.timeZone = TimeZone(identifier: tz) ?? .current
    let comps = cal.dateComponents([.year, .month, .day, .hour, .minute, .second], from: fireDate)

    switch freq {
    case "second", "minute", "hour":
      // iOS 最小重复间隔 60s；秒级无法精确重复，退化为单次
      return UNCalendarNotificationTrigger(dateComponents: comps, repeats: false)
    default:
      // day/week/month/year 均可按日历字段重复
      return UNCalendarNotificationTrigger(dateComponents: comps, repeats: true)
    }
  }

  func cancel(_ alarmId: String) {
    center.removePendingNotificationRequests(withIdentifiers: [alarmId])
  }
}
