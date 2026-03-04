"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { useScrollBoost } from "react-scrollbooster";
import useResizeObserver from "use-resize-observer";
import Scrollbar from "./Scrollbar";
import Lightbox from "./Lightbox";
import isMobile from "./isMobile";
import styles from "./Attachments.module.css";

type AttachmentMedia = {
  type: "image" | "video";
  url: string;
  width: number;
  height: number;
};

type AttachmentsProps = {
  attachments: AttachmentMedia[];
};

const Attachments: React.FC<AttachmentsProps> = ({ attachments }) => {
  const [lightboxState, setLightboxState] = useState({
    open: false,
    startingIndex: 0,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const galleryHeight = 90;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [viewport, scrollbooster] = useScrollBoost({
    direction: "horizontal",
    friction: 0.05,
    scrollMode: "native",
    textSelection: false,
    onUpdate: (data) => {
      if (containerRef.current) {
        containerRef.current.scrollLeft = data.position.x;
      }
    },
    shouldScroll: () => !isMobile(),
  });

  const updateScrollbooster = () => {
    if (!scrollbooster || !containerRef.current) return;
    scrollbooster.updateMetrics();
  };

  const onResize = () => {
    updateScrollbooster();
  };

  const setRefs = useCallback<React.RefCallback<HTMLDivElement>>(
    (node) => {
      containerRef.current = node;
      viewport(node);
      onResize();
    },
    [viewport],
  );

  useResizeObserver({ ref: containerRef as never, onResize });
  useResizeObserver({ ref: innerRef as never, onResize });

  return (
    <>
      <div className={styles.attachments} style={{ paddingTop: galleryHeight }}>
        <div ref={setRefs} className={styles.scrollableArea}>
          <div ref={innerRef} className={styles.images}>
            {attachments.map((media, index) => (
              <Attachment
                onClick={() =>
                  setLightboxState({
                    open: true,
                    startingIndex: index,
                  })
                }
                media={media}
                key={media.url}
                height={galleryHeight}
              />
            ))}
          </div>
        </div>
      </div>

      <Scrollbar scrollview={containerRef} innerChild={scrollRef} inlineStyle={{ marginTop: 8 }} />

      <AnimatePresence>
        {lightboxState.open ? (
          <Lightbox
            attachments={attachments}
            startingIndex={lightboxState.startingIndex}
            close={() => setLightboxState({ open: false, startingIndex: 0 })}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
};

type AttachmentProps = {
  media: AttachmentMedia;
  height: number;
  onClick: () => void;
};

const Attachment: React.FC<AttachmentProps> = ({ media, height, onClick }) => {
  const maxWidth = 21 / 9;
  const minWidth = 19 / 5 / 9;

  const returnThumbnailAspectRatio = (ratio: number) => {
    if (ratio < minWidth) return minWidth;
    if (ratio > maxWidth) return maxWidth;
    return ratio;
  };

  return (
    <div
      style={{
        height,
        aspectRatio: returnThumbnailAspectRatio(media.width / media.height),
      }}
      onClick={onClick}
      className={styles.media}
    >
      {media.type === "image" ? (
        <Image
          alt=""
          src={media.url}
          height={height}
          width={height * returnThumbnailAspectRatio(media.width / media.height)}
        />
      ) : (
        <video src={media.url} autoPlay loop muted playsInline />
      )}
    </div>
  );
};

export default Attachments;
