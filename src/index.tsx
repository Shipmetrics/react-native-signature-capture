import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import {
  DeviceEventEmitter,
  findNodeHandle,
  HostComponent,
  NativeSyntheticEvent,
  requireNativeComponent,
  UIManager,
  ViewProps,
} from 'react-native'

const VIEW_NAME = 'RSSignatureView'

/** Payload delivered when the user saves their signature. */
export interface SaveEventParams {
  /** `file://` path of the rendered signature image. */
  pathName: string
  /** Base64-encoded PNG. Currently only populated on some platforms. */
  encoded?: string
}

/** Payload delivered the first time the user draws on the canvas. */
export interface DragEventParams {
  dragged: boolean
}

export interface SignatureCaptureProps extends ViewProps {
  /** Fired once a signature image has been written to disk. */
  onSaveEvent?: (params: SaveEventParams) => void
  /** Fired when the user starts drawing. */
  onDragEvent?: (params: DragEventParams) => void
  /** iOS only. Rotate the saved image 90° clockwise. */
  rotateClockwise?: boolean
  /** iOS only. Crop the saved image to a square. */
  square?: boolean
  /** Android only. Persist the image to external (gallery-visible) storage. */
  saveImageFileInExtStorage?: boolean
  /** Android only. Lock the canvas to `"portrait"` or `"landscape"`. */
  viewMode?: 'portrait' | 'landscape'
  /** Render the native "Save"/"Reset" buttons. */
  showNativeButtons?: boolean
  /** Android only. Max edge length of the saved image (aspect ratio kept). Default 500. */
  maxSize?: number
  /**
   * Currently a no-op on both native platforms; accepted for forward
   * compatibility and to keep call sites that set a pen color type-safe.
   */
  strokeColor?: string
}

/** Imperative API exposed via `ref`. */
export interface SignatureCaptureRef {
  /** Trigger the native save flow (emits `onSaveEvent`). */
  saveImage: () => void
  /** Clear the canvas. */
  resetImage: () => void
}

interface NativeChangeEvent {
  pathName?: string
  encoded?: string
  dragged?: boolean
}

// `onChange` carries the native view events on Android (mapped from the core
// `topChange` bubbling event); it is internal and not part of the public props.
type NativeProps = SignatureCaptureProps & {
  onChange?: (event: NativeSyntheticEvent<NativeChangeEvent>) => void
}

const RSSignatureView: HostComponent<NativeProps> =
  requireNativeComponent<NativeProps>(VIEW_NAME)

const SignatureCapture = forwardRef<SignatureCaptureRef, SignatureCaptureProps>(
  (props, ref) => {
    const { onSaveEvent, onDragEvent, ...rest } = props
    const nativeRef = useRef<React.ComponentRef<typeof RSSignatureView>>(null)

    const dispatchCommand = useCallback((command: 'saveImage' | 'resetImage') => {
      const handle = findNodeHandle(nativeRef.current)
      if (handle == null) {
        return
      }
      const commands = UIManager.getViewManagerConfig(VIEW_NAME)?.Commands
      const commandId = commands?.[command]
      if (commandId == null) {
        return
      }
      UIManager.dispatchViewManagerCommand(handle, commandId, [])
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        saveImage: () => dispatchCommand('saveImage'),
        resetImage: () => dispatchCommand('resetImage'),
      }),
      [dispatchCommand],
    )

    // iOS delivers events globally via DeviceEventEmitter rather than through
    // the view's `onChange`, so we subscribe to both paths.
    useEffect(() => {
      const subscriptions = [
        onSaveEvent &&
          DeviceEventEmitter.addListener('onSaveEvent', onSaveEvent),
        onDragEvent &&
          DeviceEventEmitter.addListener('onDragEvent', onDragEvent),
      ]
      return () => {
        subscriptions.forEach((sub) => sub && sub.remove())
      }
    }, [onSaveEvent, onDragEvent])

    // Android delivers events through the native view's `onChange`.
    const handleChange = useCallback(
      (event: NativeSyntheticEvent<NativeChangeEvent>) => {
        const { pathName, encoded, dragged } = event.nativeEvent
        if (pathName) {
          onSaveEvent?.({ pathName, encoded })
        }
        if (dragged) {
          onDragEvent?.({ dragged })
        }
      },
      [onSaveEvent, onDragEvent],
    )

    return <RSSignatureView {...rest} ref={nativeRef} onChange={handleChange} />
  },
)

SignatureCapture.displayName = 'SignatureCapture'

export default SignatureCapture
