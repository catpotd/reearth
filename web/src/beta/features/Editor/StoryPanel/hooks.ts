import { useCallback, useMemo, useState } from "react";

import useStorytellingAPI from "@reearth/services/api/storytellingApi";
import type { StoryFragmentFragment, StoryPageFragmentFragment } from "@reearth/services/gql";

export type { StoryFragmentFragment, StoryPageFragmentFragment } from "@reearth/services/gql";

export default ({
  sceneId,
  selectedStory,
  currentPage,
  onCurrentPageChange,
}: {
  sceneId?: string;
  selectedStory?: StoryFragmentFragment;
  currentPage?: StoryPageFragmentFragment;
  onCurrentPageChange: (id: string, disableScrollIntoView?: boolean) => void;
}) => {
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>();
  const [selectedBlockId, setSelectedBlockId] = useState<string>();

  const handlePageSettingsToggle = useCallback(() => {
    if (!selectedPageId) return;
    setShowPageSettings(show => !show);
  }, [selectedPageId]);

  const handlePageSelect = useCallback(
    (pageId?: string) => {
      if (selectedBlockId) {
        setSelectedBlockId(undefined);
      }
      setSelectedPageId(pid => (pageId && pid !== pageId ? pageId : undefined));
    },
    [selectedBlockId],
  );

  const handleBlockSelect = useCallback(
    (blockId?: string) => {
      if (selectedPageId) {
        setSelectedPageId(undefined);
      }
      setSelectedBlockId(id => (!blockId || id === blockId ? undefined : blockId));
    },
    [selectedPageId],
  );

  const { useInstallableStoryBlocksQuery } = useStorytellingAPI();

  const { installableStoryBlocks } = useInstallableStoryBlocksQuery({ sceneId });

  const handleCurrentPageChange = useCallback(
    (pageId: string) => {
      onCurrentPageChange(pageId, true); // true disables scrollIntoView
    },
    [onCurrentPageChange],
  );

  const pageInfo = useMemo(() => {
    const pages = selectedStory?.pages ?? [];
    if ((pages?.length ?? 0) < 2) return;

    const currentIndex = pages.findIndex(p => p.id === currentPage?.id);
    return {
      currentPage: currentIndex + 1,
      maxPage: pages.length,
      onPageChange: (pageIndex: number) => onCurrentPageChange(pages[pageIndex - 1]?.id),
    };
  }, [selectedStory, currentPage, onCurrentPageChange]);

  return {
    pageInfo,
    installableBlocks: installableStoryBlocks,
    selectedPageId,
    selectedBlockId,
    showPageSettings,
    handlePageSettingsToggle,
    handlePageSelect,
    handleBlockSelect,
    handleCurrentPageChange,
  };
};