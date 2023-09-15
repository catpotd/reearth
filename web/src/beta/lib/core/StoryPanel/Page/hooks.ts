import { useCallback, useMemo, useState } from "react";

import { ValueType, ValueTypes } from "@reearth/beta/utils/value";
import { usePropertyFetcher } from "@reearth/services/api";
import { Item } from "@reearth/services/api/propertyApi/utils";
import useStorytellingAPI from "@reearth/services/api/storytellingApi";

export default ({
  storyId,
  pageId,
  propertyItems,
}: {
  sceneId?: string;
  storyId?: string;
  pageId?: string;
  propertyItems?: Item[];
}) => {
  const [openBlocksIndex, setOpenBlocksIndex] = useState<number>();

  const handleBlockOpen = useCallback(
    (index: number) => {
      if (openBlocksIndex === index) {
        setOpenBlocksIndex(undefined);
      } else {
        setOpenBlocksIndex(index);
      }
    },
    [openBlocksIndex],
  );

  const { useUpdatePropertyValue } = usePropertyFetcher();

  const handlePropertyValueUpdate = useCallback(
    async (
      propertyId?: string,
      schemaItemId?: string,
      fieldId?: string,
      itemId?: string,
      vt?: ValueType,
      v?: ValueTypes[ValueType],
    ) => {
      if (!propertyId || !schemaItemId || !fieldId || !vt) return;
      await useUpdatePropertyValue(propertyId, schemaItemId, itemId, fieldId, "en", v, vt);
    },
    [useUpdatePropertyValue],
  );

  const { useCreateStoryBlock, useDeleteStoryBlock } = useStorytellingAPI();

  const handleStoryBlockCreate = useCallback(
    (index?: number) => async (extensionId?: string, pluginId?: string) => {
      if (!extensionId || !pluginId || !storyId || !pageId) return;
      await useCreateStoryBlock({
        pluginId,
        extensionId,
        storyId,
        pageId,
        index,
      });
    },
    [storyId, pageId, useCreateStoryBlock],
  );

  const handleStoryBlockDelete = useCallback(
    async (blockId?: string) => {
      if (!blockId || !storyId || !pageId) return;
      await useDeleteStoryBlock({ blockId, pageId, storyId });
    },
    [storyId, pageId, useDeleteStoryBlock],
  );

  const titleProperty = useMemo(
    () => propertyItems?.find(i => i.schemaGroup === "title"),
    [propertyItems],
  );

  const titleId = useMemo(() => `${pageId}/title`, [pageId]);

  return {
    openBlocksIndex,
    titleId,
    titleProperty,
    handleStoryBlockCreate,
    handleStoryBlockDelete,
    handleBlockOpen,
    handlePropertyValueUpdate,
  };
};
