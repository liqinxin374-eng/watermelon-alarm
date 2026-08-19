import Foundation
import UserNotifications

/**
 * RN 原生模块（iOS）：基于 UNUserNotificationCenter 注册本地通知。
 *
 * ⚠️ iOS 系统限制（方案1）：
 *  - 通知声音必须打包进 App Bundle，最长 30 秒，无法循环超 30s；
 *  - App 被用户手动杀死(swipe-kill)后，iOS 不再投递任何通知（含本地）。
 * 如需更强能力，需申请 Critical Alert entitlement（见框架文档 §5）。
 */
@objc(AlarmModule)
class AlarmModule: RCTEventEmitter {
  private let scheduler = AlarmScheduler()

  override func supportedEvents() -> [String]! {
    return ["onAlarmFired"]
  }

  override static func requiresMainQueueSetup() -> Bool { return true }

  @objc(schedule:resolve:reject:)
  func schedule(_ alarm: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    scheduler.schedule(alarm) { error in
      if let error = error {
        reject("E", error.localizedDescription, error)
      } else {
        resolve(nil)
      }
    }
  }

  @objc(cancel:resolve:reject:)
  func cancel(_ alarmId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    scheduler.cancel(alarmId)
    resolve(nil)
  }

  // 由 AlarmScheduler 在通知送达(前台)时调用，转发给 JS
  func emitFired(_ alarmId: String) {
    sendEvent(withName: "onAlarmFired", body: ["alarmId": alarmId])
  }
}
