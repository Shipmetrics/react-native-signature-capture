#import "RSSignatureViewManager.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTUIManager.h>

@implementation RSSignatureViewManager

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE()

RCT_EXPORT_VIEW_PROPERTY(rotateClockwise, BOOL)
RCT_EXPORT_VIEW_PROPERTY(square, BOOL)
RCT_EXPORT_VIEW_PROPERTY(showNativeButtons, BOOL)
RCT_EXPORT_VIEW_PROPERTY(strokeColor, UIColor)


-(dispatch_queue_t) methodQueue
{
	return dispatch_get_main_queue();
}

-(UIView *) view
{
	RSSignatureView *signView = [[RSSignatureView alloc] init];
	signView.manager = self;
	return signView;
}

// Resolve the view by its tag: several signature views can exist at once.
// viewRegistry also resolves Fabric views (RCTComposedViewRegistry falls back
// to viewForReactTag:), so this works under the legacy-view interop layer.
RCT_EXPORT_METHOD(saveImage:(nonnull NSNumber *)reactTag) {
	[self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
		RSSignatureView *view = (RSSignatureView *)viewRegistry[reactTag];
		if ([view isKindOfClass:[RSSignatureView class]]) {
			[view saveImage];
		}
	}];
}

RCT_EXPORT_METHOD(resetImage:(nonnull NSNumber *)reactTag) {
	[self.bridge.uiManager addUIBlock:^(RCTUIManager *uiManager, NSDictionary<NSNumber *, UIView *> *viewRegistry) {
		RSSignatureView *view = (RSSignatureView *)viewRegistry[reactTag];
		if ([view isKindOfClass:[RSSignatureView class]]) {
			[view erase];
		}
	}];
}

-(void) publishSaveImageEvent:(NSString *) aTempPath {
	[self.bridge.eventDispatcher
	 sendDeviceEventWithName:@"onSaveEvent"
	 body:@{
					@"pathName": aTempPath
					}];
}

-(void) publishDraggedEvent {
	[self.bridge.eventDispatcher
	 sendDeviceEventWithName:@"onDragEvent"
	 body:@{@"dragged": @YES}];
}

@end
