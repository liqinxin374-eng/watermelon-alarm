// 桥接导出：将 Swift 实现的 AlarmModule 暴露给 React Native Bridge
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AlarmModule, RCTEventEmitter)

RCT_EXTERN_METHOD(schedule:(NSDictionary *)alarm
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cancel:(NSString *)alarmId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
