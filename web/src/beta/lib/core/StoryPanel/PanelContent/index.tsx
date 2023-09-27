import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

import { ValueType, ValueTypes } from "@reearth/beta/utils/value";
import type { InstallableStoryBlock } from "@reearth/services/api/storytellingApi/blocks";
import { styled } from "@reearth/services/theme";

import type { Page } from "../hooks";
import StoryPage from "../Page";

export const PAGES_ELEMENT_ID = "story-page-content";

export type Props = {
  pages?: Page[];
  selectedPageId?: string;
  installableStoryBlocks?: InstallableStoryBlock[];
  selectedStoryBlockId?: string;
  showPageSettings?: boolean;
  showingIndicator?: boolean;
  isAutoScrolling?: boolean;
  isEditable?: boolean;
  onAutoScrollingChange: (isScrolling: boolean) => void;
  onPageSettingsToggle?: () => void;
  onPageSelect?: (pageId?: string | undefined) => void;
  onBlockCreate?: (
    index?: number,
  ) => (
    pageId?: string | undefined,
    extensionId?: string | undefined,
    pluginId?: string | undefined,
  ) => Promise<void>;
  onBlockDelete?: (pageId?: string | undefined, blockId?: string | undefined) => Promise<void>;
  onBlockSelect?: (blockId?: string) => void;
  onPropertyUpdate?: (
    propertyId?: string,
    schemaItemId?: string,
    fieldId?: string,
    itemId?: string,
    vt?: ValueType,
    v?: ValueTypes[ValueType],
  ) => Promise<void>;
  onCurrentPageChange?: (pageId: string) => void;
  onStoryBlockMove: (id: string, targetId: number, blockId: string) => void;
};

const StoryContent: React.FC<Props> = ({
  pages,
  selectedPageId,
  installableStoryBlocks,
  selectedStoryBlockId,
  showPageSettings,
  showingIndicator,
  isAutoScrolling,
  isEditable,
  onAutoScrollingChange,
  onPageSettingsToggle,
  onPageSelect,
  onBlockCreate,
  onBlockDelete,
  onBlockSelect,
  onPropertyUpdate,
  onCurrentPageChange,
  onStoryBlockMove,
}) => {
  const scrollRef = useRef<number | undefined>(undefined);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const [pageGap, setPageGap] = useState<number>();

  useLayoutEffect(() => {
    const pageWrapperElement = document.getElementById(PAGES_ELEMENT_ID);
    if (pageWrapperElement) setPageGap(pageWrapperElement.clientHeight - 40); // 40px is the height of the page title block
  }, [setPageGap]);

  useEffect(() => {
    const resizeCallback = () => {
      const pageWrapperElement = document.getElementById(PAGES_ELEMENT_ID);
      if (pageWrapperElement) setPageGap(pageWrapperElement.clientHeight - 40); // 40px is the height of the page title block
    };
    window.addEventListener("resize", resizeCallback);
    return () => window.removeEventListener("resize", resizeCallback);
  }, []);

  useEffect(() => {
    const ids = pages?.map(p => p.id) as string[];
    const panelContentElement = document.getElementById(PAGES_ELEMENT_ID);

    const observer = new IntersectionObserver(
      entries => {
        if (isAutoScrolling) return; // to avoid conflicts with page selection in editor UI
        entries.forEach(entry => {
          const id = entry.target.getAttribute("id") ?? "";
          if (selectedPageId === id) return;

          const diff = (scrollRef.current as number) - (panelContentElement?.scrollTop as number);
          const isScrollingUp = diff > 0;

          if (entry.isIntersecting) {
            onCurrentPageChange?.(id);
            scrollRef.current = panelContentElement?.scrollTop;
            return;
          }
          const currentIndex = ids?.indexOf(id) as number;
          const prevEntry = ids[currentIndex - 1];
          if (isScrollingUp) {
            const id = prevEntry;
            onCurrentPageChange?.(id);
          }
        });
      },
      {
        root: panelContentElement,
        threshold: 0.2,
      },
    );
    ids?.forEach(id => {
      const e = document.getElementById(id);
      if (e) {
        observer.observe(e);
      }
    });
    return () => {
      ids?.forEach(id => {
        const e = document.getElementById(id);
        if (e) {
          observer.unobserve(e);
        }
      });
    };
  }, [pages, selectedPageId, isAutoScrolling, onCurrentPageChange]);

  useEffect(() => {
    const wrapperElement = document.getElementById(PAGES_ELEMENT_ID);
    if (isAutoScrolling) {
      wrapperElement?.addEventListener("scroll", () => {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(function () {
          onAutoScrollingChange(false);
        }, 100);
      });
    }
  }, [isAutoScrolling, onAutoScrollingChange]);

  return (
    <PagesWrapper id={PAGES_ELEMENT_ID} showingIndicator={showingIndicator} isEditable={isEditable}>
      {pages?.map(p => (
        <Fragment key={p.id}>
          <StoryPage
            page={p}
            selectedPageId={selectedPageId}
            installableStoryBlocks={installableStoryBlocks}
            selectedStoryBlockId={selectedStoryBlockId}
            showPageSettings={showPageSettings}
            isEditable={isEditable}
            onPageSettingsToggle={onPageSettingsToggle}
            onPageSelect={onPageSelect}
            onBlockCreate={onBlockCreate}
            onBlockDelete={onBlockDelete}
            onBlockSelect={onBlockSelect}
            onStoryBlockMove={onStoryBlockMove}
            onPropertyUpdate={onPropertyUpdate}
          />
          <PageGap height={pageGap} onClick={() => onPageSelect?.(p.id)} />
        </Fragment>
      ))}
    </PagesWrapper>
  );
};

export default StoryContent;

const PagesWrapper = styled.div<{ showingIndicator?: boolean; isEditable?: boolean }>`
  height: ${({ showingIndicator }) => (showingIndicator ? "calc(100% - 8px)" : "100%")};
  overflow-y: auto;
  cursor: ${({ isEditable }) => (isEditable ? "pointer" : "default")};
`;

const PageGap = styled.div<{ height?: number }>`
  height: ${({ height }) => (height ? height + "px" : "70vh")};
`;