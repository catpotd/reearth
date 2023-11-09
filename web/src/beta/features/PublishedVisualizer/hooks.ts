import { useState, useMemo, useEffect, useCallback } from "react";

import {
  InternalWidget,
  WidgetAlignSystem,
  WidgetAlignment,
  BuiltinWidgets,
  isBuiltinWidget,
} from "@reearth/beta/lib/core/Crust";
import { Story } from "@reearth/beta/lib/core/StoryPanel";
import { config } from "@reearth/services/config";
import { useSelectedStoryPageId } from "@reearth/services/state";

import { processLayers } from "../Editor/Visualizer/convert";

import { processProperty } from "./convert";
import { processStoryProperty } from "./convert-story";
import { useGA } from "./googleAnalytics/useGA";
import type {
  PublishedData,
  WidgetZone,
  WidgetSection,
  WidgetArea,
  WidgetAreaPadding,
} from "./types";

export default (alias?: string) => {
  const [data, setData] = useState<PublishedData>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const sceneProperty = processProperty(data?.property);
  const pluginProperty = useMemo(
    () =>
      Object.keys(data?.plugins ?? {}).reduce<{ [key: string]: any }>(
        (a, b) => ({ ...a, [b]: processProperty(data?.plugins?.[b]?.property) }),
        {},
      ),
    [data?.plugins],
  );

  const widgets = useMemo<
    | {
        floatingWidgets: InternalWidget[];
        alignSystem: WidgetAlignSystem | undefined;
        ownBuiltinWidgets: (keyof BuiltinWidgets)[];
      }
    | undefined
  >(() => {
    if (!data?.widgets) return undefined;

    const widgetsInWas = new Set<string>();
    if (data.widgetAlignSystem) {
      for (const z of ["inner", "outer"] as const) {
        for (const s of ["left", "center", "right"] as const) {
          for (const a of ["top", "middle", "bottom"] as const) {
            for (const w of data.widgetAlignSystem?.[z]?.[s]?.[a]?.widgetIds ?? []) {
              widgetsInWas.add(w);
            }
          }
        }
      }
    }

    const floatingWidgets = data?.widgets
      .filter(w => !widgetsInWas.has(w.id))
      .map(
        (w): InternalWidget => ({
          id: w.id,
          extended: !!w.extended,
          pluginId: w.pluginId,
          extensionId: w.extensionId,
          property: processProperty(w.property),
        }),
      );

    const widgets = data?.widgets
      .filter(w => widgetsInWas.has(w.id))
      .map(
        (w): InternalWidget => ({
          id: w.id,
          extended: !!w.extended,
          pluginId: w.pluginId,
          extensionId: w.extensionId,
          property: processProperty(w.property),
        }),
      );

    const widgetZone = (zone?: WidgetZone | null) => {
      return {
        left: widgetSection(zone?.left),
        center: widgetSection(zone?.center),
        right: widgetSection(zone?.right),
      };
    };

    const widgetSection = (section?: WidgetSection | null) => {
      return {
        top: widgetArea(section?.top),
        middle: widgetArea(section?.middle),
        bottom: widgetArea(section?.bottom),
      };
    };

    const widgetArea = (area?: WidgetArea | null) => {
      const align = area?.align.toLowerCase() as WidgetAlignment | undefined;
      const padding = area?.padding as WidgetAreaPadding | undefined;
      const areaWidgets: InternalWidget[] | undefined = area?.widgetIds
        .map<InternalWidget | undefined>(w => widgets?.find(w2 => w === w2.id))
        .filter((w): w is InternalWidget => !!w);
      return {
        align: align ?? "start",
        padding: {
          top: padding?.top ?? 6,
          bottom: padding?.bottom ?? 6,
          left: padding?.left ?? 6,
          right: padding?.right ?? 6,
        },
        widgets: areaWidgets || [],
        background: area?.background as string | undefined,
        centered: area?.centered,
        gap: area?.gap ?? undefined,
      };
    };

    const ownBuiltinWidgets = data.widgets.reduce<(keyof BuiltinWidgets)[]>((res, next) => {
      const id = `${next.pluginId}/${next.extensionId}`;
      return isBuiltinWidget(id) && widgetsInWas.has(next.id) ? [...res, id] : res;
    }, []);

    return {
      floatingWidgets,
      alignSystem: data.widgetAlignSystem
        ? {
            outer: widgetZone(data.widgetAlignSystem.outer),
            inner: widgetZone(data.widgetAlignSystem.inner),
          }
        : undefined,
      ownBuiltinWidgets,
    };
  }, [data]);

  const actualAlias = useMemo(
    () => alias || new URLSearchParams(window.location.search).get("alias") || undefined,
    [alias],
  );

  const story = useMemo(() => {
    const s = data?.story;
    const processedStory: Story | undefined = !s
      ? undefined
      : {
          id: s.id,
          title: s.title,
          position: s.position,
          bgColor: s.bgColor || "#f1f1f1",
          pages: s.pages.map(p => {
            return {
              id: p.id,
              swipeable: p.swipeable,
              layerIds: p.layers,
              property: processStoryProperty(p.property),
              blocks: p.blocks.map(b => {
                return {
                  id: b.id,
                  pluginId: b.pluginId,
                  extensionId: b.extensionId,
                  property: processStoryProperty(b.property),
                };
              }),
            };
          }),
        };
    return processedStory;
  }, [data?.story]);

  const [currentPageId, setCurrentPageId] = useSelectedStoryPageId();

  const currentPage = useMemo(
    () => story?.pages.find(p => p.id === currentPageId),
    [currentPageId, story?.pages],
  );

  const handleCurrentPageChange = useCallback(
    (pageId?: string) => setCurrentPageId(pageId),
    [setCurrentPageId],
  );

  const layers = useMemo(() => {
    const processedLayers = processLayers(
      data?.nlsLayers?.map(l => ({
        id: l.id,
        title: l.title,
        config: l.config,
        layerType: l.layerType,
        visible: !!l.isVisible,
      })) ?? [],
      data?.layerStyles,
    );
    if (!story) return processedLayers;

    return processedLayers?.map(layer => ({
      ...layer,
      visible: currentPage?.layerIds?.includes(layer.id),
    }));
  }, [data?.nlsLayers, data?.layerStyles, currentPage?.layerIds, story]);

  useEffect(() => {
    const url = dataUrl(actualAlias);
    (async () => {
      try {
        const res = await fetch(url, {});
        if (res.status >= 300) {
          setError(true);
          return;
        }
        const d = (await res.json()) as PublishedData | undefined;
        if (d?.schemaVersion !== 1) {
          // TODO: not supported version
          return;
        }

        // For compability: map tiles are not shown by default
        if (
          new Date(d.publishedAt) < new Date(2021, 0, 13, 18, 20, 0) &&
          (!d?.property?.tiles || d.property.tiles.length === 0)
        ) {
          d.property = {
            ...d.property,
            tiles: [{ id: "___default_tile___" }],
          };
        }

        setData(d);
      } catch (e) {
        // TODO: display error for users
        console.error(e);
      } finally {
        setReady(true);
      }
    })();
  }, [actualAlias]);

  const engineMeta = useMemo(
    () => ({
      cesiumIonAccessToken: config()?.cesiumIonAccessToken,
    }),
    [],
  );

  // GA
  useGA(sceneProperty);

  return {
    sceneProperty,
    pluginProperty,
    layers,
    widgets,
    story,
    ready,
    error,
    engineMeta,
    handleCurrentPageChange,
  };
};

const dataUrl = (alias?: string): string => {
  if (alias && window.REEARTH_CONFIG?.api) {
    return `${window.REEARTH_CONFIG.api}/published_data/${alias}`;
  }
  return "data.json";
};
