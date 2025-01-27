import { clone } from "lodash-es";
import { Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

// TODO: Move these utils
import { type DropOptions, useDrop } from "@reearth/beta/utils/use-dnd";

import type { ComputedFeature, Feature, LatLng, SelectedFeatureInfo } from "../mantle";
import type {
  Ref as MapRef,
  LayerSelectionReason,
  Camera,
  ComputedLayer,
  SceneProperty,
  LayerEditEvent,
  CursorType,
  LayerVisibilityEvent,
  LayerLoadEvent,
  LayerSelectWithRectStart,
  LayerSelectWithRectMove,
  LayerSelectWithRectEnd,
} from "../Map";
import { useOverriddenProperty } from "../Map";
import { SketchEventCallback, SketchEventProps, SketchType } from "../Map/Sketch/types";
import { TimelineManagerRef } from "../Map/useTimelineManager";

import type { InteractionModeType } from "./interactionMode";
import { INTERACTION_MODES } from "./interactionMode";
import useViewport from "./useViewport";

export default function useHooks(
  {
    camera: initialCamera,
    interactionMode: initialInteractionMode,
    sceneProperty,
    isEditable,
    rootLayerId,
    zoomedLayerId,
    onLayerSelect,
    onCameraChange,
    onInteractionModeChange,
    onZoomToLayer,
    onLayerDrop,
    onSketchTypeChangeProp,
  }: {
    camera?: Camera;
    interactionMode?: InteractionModeType;
    isEditable?: boolean;
    rootLayerId?: string;
    sceneProperty?: SceneProperty;
    zoomedLayerId?: string;
    onLayerSelect?: (
      layerId: string | undefined,
      layer: (() => Promise<ComputedLayer | undefined>) | undefined,
      feature: ComputedFeature | undefined,
      reason: LayerSelectionReason | undefined,
    ) => void;
    onCameraChange?: (camera: Camera) => void;
    onInteractionModeChange?: (mode: InteractionModeType) => void;
    onZoomToLayer?: (layerId: string | undefined) => void;
    onLayerDrop?: (layerId: string, propertyKey: string, position: LatLng | undefined) => void;
    onSketchTypeChangeProp?: (type: SketchType | undefined, from?: "editor" | "plugin") => void;
  },
  ref: Ref<MapRef | null>,
) {
  const mapRef = useRef<MapRef>(null);

  useImperativeHandle(ref, () => mapRef.current, []);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const { ref: dropRef, isDroppable } = useDrop(
    useMemo(
      (): DropOptions => ({
        accept: ["primitive"],
        drop(_item, context) {
          if (!rootLayerId || !isEditable) return;
          const loc = context.position
            ? mapRef.current?.engine.getLocationFromScreen(context.position.x, context.position.y)
            : undefined;
          return {
            type: "earth",
            layerId: rootLayerId,
            position: loc ? { lat: loc.lat, lng: loc.lng, height: loc.height } : undefined,
          };
        },
        wrapperRef,
      }),
      [rootLayerId, isEditable],
    ),
  );
  dropRef(wrapperRef);

  const viewport = useViewport({
    wrapperRef,
  });

  // layer
  const [selectedLayer, selectLayer] = useState<{
    layerId?: string;
    featureId?: string;
    layer?: ComputedLayer;
    reason?: LayerSelectionReason;
  }>({});
  const [selectedFeature, selectFeature] = useState<Feature>();
  const [selectedComputedFeature, selectComputedFeature] = useState<ComputedFeature>();

  const handleLayerSelect = useCallback(
    async (
      layerId: string | undefined,
      featureId: string | undefined,
      layer: (() => Promise<ComputedLayer | undefined>) | undefined,
      reason: LayerSelectionReason | undefined,
      info: SelectedFeatureInfo | undefined,
    ) => {
      if (selectedLayer.layerId === layerId && selectedLayer.featureId === featureId) return;

      const computedLayer = await layer?.();
      const computedFeature =
        layerId && featureId
          ? mapRef.current?.engine.findComputedFeatureById?.(layerId, featureId) ?? info?.feature
          : undefined;

      selectFeature(
        layerId && featureId
          ? mapRef.current?.engine.findFeatureById?.(layerId, featureId)
          : undefined,
      );
      selectComputedFeature(computedFeature);

      selectLayer(l =>
        l.layerId === layerId && l.featureId === featureId
          ? l
          : { layerId, featureId, layer: computedLayer, reason },
      );

      onLayerSelect?.(layerId, layer, computedFeature, reason);
    },
    [selectedLayer, onLayerSelect],
  );

  const timelineManagerRef: TimelineManagerRef = useRef();

  // scene
  const [overriddenSceneProperty, originalOverrideSceneProperty] =
    useOverriddenProperty(sceneProperty);

  const overrideSceneProperty = useCallback(
    (pluginId: string, property: SceneProperty) => {
      if (property.timeline) {
        const filteredTimeline = clone(property.timeline);
        delete filteredTimeline.visible;
        if (Object.keys(filteredTimeline).length > 0) {
          if (
            filteredTimeline.current !== undefined ||
            filteredTimeline.start !== undefined ||
            filteredTimeline.stop !== undefined
          ) {
            timelineManagerRef?.current?.commit({
              cmd: "SET_TIME",
              payload: {
                start:
                  filteredTimeline.start ?? timelineManagerRef?.current?.computedTimeline.start,
                stop: filteredTimeline.stop ?? timelineManagerRef?.current?.computedTimeline.stop,
                current:
                  filteredTimeline.current ?? timelineManagerRef?.current?.computedTimeline.current,
              },
              committer: {
                source: "overrideSceneProperty",
                id: pluginId,
              },
            });
          }
          if (
            filteredTimeline.multiplier !== undefined ||
            filteredTimeline.stepType !== undefined ||
            filteredTimeline.rangeType !== undefined
          ) {
            timelineManagerRef?.current?.commit({
              cmd: "SET_OPTIONS",
              payload: {
                stepType: filteredTimeline.stepType,
                multiplier: filteredTimeline.multiplier,
                rangeType: filteredTimeline.rangeType,
              },
              committer: {
                source: "overrideSceneProperty",
                id: pluginId,
              },
            });
          }
          if (filteredTimeline.animation !== undefined) {
            timelineManagerRef?.current?.commit({
              cmd: filteredTimeline.animation ? "PLAY" : "PAUSE",
              committer: {
                source: "overrideSceneProperty",
                id: pluginId,
              },
            });
          }
        }
      }
      originalOverrideSceneProperty(pluginId, property);
    },
    [timelineManagerRef, originalOverrideSceneProperty],
  );

  // camera
  const [camera, changeCamera] = useValue(initialCamera, onCameraChange);

  const [cameraForceHorizontalRoll, setCameraForceHorizontalRoll] = useState(false);
  const handleCameraForceHorizontalRollChange = useCallback((enable?: boolean) => {
    setCameraForceHorizontalRoll(!!enable);
  }, []);

  // interaction mode
  const [_interactionMode, changeInteractionMode] = useValue(
    initialInteractionMode,
    onInteractionModeChange,
  );
  const interactionMode = _interactionMode || "default";

  const [cursor, setCursor] = useState<CursorType>("auto");
  useEffect(() => {
    setCursor(
      interactionMode === "sketch" ? "crosshair" : interactionMode === "move" ? "grab" : "auto",
    );
  }, [interactionMode]);

  // feature flags
  const featureFlags = INTERACTION_MODES[interactionMode];

  // layer edit
  const onLayerEditRef = useRef<(e: LayerEditEvent) => void>();
  const onLayerEdit = useCallback((cb: (e: LayerEditEvent) => void) => {
    onLayerEditRef.current = cb;
  }, []);
  const handleLayerEdit = useCallback((e: LayerEditEvent) => {
    onLayerEditRef.current?.(e);
  }, []);

  // layer visiblity
  const onLayerVisibilityRef = useRef<(e: LayerVisibilityEvent) => void>();
  const onLayerVisibility = useCallback((cb: (e: LayerVisibilityEvent) => void) => {
    onLayerVisibilityRef.current = cb;
  }, []);
  const handleLayerVisibility = useCallback((e: LayerVisibilityEvent) => {
    onLayerVisibilityRef.current?.(e);
  }, []);

  // layer load
  const onLayerLoadRef = useRef<(e: LayerLoadEvent) => void>();
  const onLayerLoad = useCallback((cb: (e: LayerLoadEvent) => void) => {
    onLayerLoadRef.current = cb;
  }, []);
  const handleLayerLoad = useCallback((e: LayerLoadEvent) => {
    onLayerLoadRef.current?.(e);
  }, []);

  // multiple feature selection
  const onLayerSelectWithRectStartRef = useRef<(e: LayerSelectWithRectStart) => void>();
  const onLayerSelectWithRectStart = useCallback((cb: (e: LayerSelectWithRectStart) => void) => {
    onLayerSelectWithRectStartRef.current = cb;
  }, []);
  const handleLayerSelectWithRectStart = useCallback((e: LayerSelectWithRectStart) => {
    onLayerSelectWithRectStartRef.current?.(e);
  }, []);
  const onLayerSelectWithRectMoveRef = useRef<(e: LayerSelectWithRectMove) => void>();
  const onLayerSelectWithRectMove = useCallback((cb: (e: LayerSelectWithRectMove) => void) => {
    onLayerSelectWithRectMoveRef.current = cb;
  }, []);
  const handleLayerSelectWithRectMove = useCallback((e: LayerSelectWithRectMove) => {
    onLayerSelectWithRectMoveRef.current?.(e);
  }, []);
  const onLayerSelectWithRectEndRef = useRef<(e: LayerSelectWithRectEnd) => void>();
  const onLayerSelectWithRectEnd = useCallback((cb: (e: LayerSelectWithRectEnd) => void) => {
    onLayerSelectWithRectEndRef.current = cb;
  }, []);
  const handleLayerSelectWithRectEnd = useCallback((e: LayerSelectWithRectEnd) => {
    onLayerSelectWithRectEndRef.current?.(e);
  }, []);

  // plugin sketch feature events
  const onSketchPluginFeatureCreateCallbacksRef = useRef<SketchEventCallback[]>([]);
  const onSketchPluginFeatureCreate = useCallback((cb: SketchEventCallback) => {
    onSketchPluginFeatureCreateCallbacksRef.current.push(cb);
  }, []);
  const handleSketchPluginFeatureCreate = useCallback((props: SketchEventProps) => {
    onSketchPluginFeatureCreateCallbacksRef.current.forEach(fn => fn(props));
  }, []);

  const onSketchTypeChangeCallbacksRef = useRef<((type: SketchType | undefined) => void)[]>([]);
  const onSketchTypeChange = useCallback((cb: (type: SketchType | undefined) => void) => {
    onSketchTypeChangeCallbacksRef.current.push(cb);
  }, []);
  const handleSketchTypeChange = useCallback(
    (type: SketchType | undefined, from?: "editor" | "plugin") => {
      onSketchTypeChangeCallbacksRef.current.forEach(fn => fn(type));
      onSketchTypeChangeProp?.(type, from);
    },
    [onSketchTypeChangeProp],
  );

  // zoom to layer
  useEffect(() => {
    if (zoomedLayerId) {
      mapRef.current?.engine?.lookAtLayer(zoomedLayerId);
      onZoomToLayer?.(undefined);
    }
  }, [zoomedLayerId, onZoomToLayer]);

  // dnd
  const [isLayerDragging, setIsLayerDragging] = useState(false);
  const handleLayerDrag = useCallback(() => {
    setIsLayerDragging(true);
  }, []);
  const handleLayerDrop = useCallback(
    (layerId: string, _featureId: string | undefined, latlng: LatLng | undefined) => {
      setIsLayerDragging(false);
      const layer = mapRef.current?.layers.findById(layerId);
      const propertyKey = layer?.property.default.location
        ? "default.location"
        : layer?.property.default.position
        ? "default.position"
        : undefined;
      if (latlng && layer && layer.propertyId && propertyKey) {
        onLayerDrop?.(layer.propertyId, propertyKey, latlng);
      }
    },
    [onLayerDrop, mapRef],
  );

  const coreContextValue = useMemo(
    () => ({
      interactionMode,
      selectedLayer,
      selectedComputedFeature,
      viewport,
      overriddenSceneProperty,
      overrideSceneProperty,
      handleCameraForceHorizontalRollChange,
      handleInteractionModeChange: changeInteractionMode,
      onSketchPluginFeatureCreate,
      onSketchTypeChange,
      onLayerVisibility,
      onLayerLoad,
      onLayerEdit,
      onLayerSelectWithRectStart,
      onLayerSelectWithRectMove,
      onLayerSelectWithRectEnd,
    }),
    [
      interactionMode,
      selectedLayer,
      selectedComputedFeature,
      viewport,
      overriddenSceneProperty,
      overrideSceneProperty,
      changeInteractionMode,
      handleCameraForceHorizontalRollChange,
      onLayerEdit,
      onSketchPluginFeatureCreate,
      onSketchTypeChange,
      onLayerVisibility,
      onLayerLoad,
      onLayerSelectWithRectStart,
      onLayerSelectWithRectMove,
      onLayerSelectWithRectEnd,
    ],
  );

  const containerStyle = useMemo(
    () => ({
      position: "relative" as const,
      width: "100%",
      height: "100%",
      overflow: "hidden",
    }),
    [],
  );

  return {
    mapRef,
    wrapperRef,
    selectedFeature,
    camera,
    featureFlags,
    overriddenSceneProperty,
    isDroppable,
    isLayerDragging,
    timelineManagerRef,
    cursor,
    cameraForceHorizontalRoll,
    coreContextValue,
    containerStyle,
    overrideSceneProperty,
    handleLayerSelect,
    handleLayerDrag,
    handleLayerDrop,
    handleLayerEdit,
    handleCameraChange: changeCamera,
    handleInteractionModeChange: changeInteractionMode,
    handleSketchPluginFeatureCreate,
    handleSketchTypeChange,
    handleLayerVisibility,
    handleLayerLoad,
    handleLayerSelectWithRectStart,
    handleLayerSelectWithRectMove,
    handleLayerSelectWithRectEnd,
  };
}

function useValue<T>(
  initial: T | undefined,
  onChange: ((t: T) => void) | undefined,
): [T | undefined, (v?: T) => void] {
  const [state, set] = useState(initial);

  const handleOnChange = useCallback(
    (v?: T) => {
      if (v) {
        set(v);
        onChange?.(v);
      }
    },
    [onChange],
  );

  useEffect(() => {
    set(initial);
  }, [initial]);

  return [state, handleOnChange];
}
