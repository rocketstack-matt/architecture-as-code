"use client";

import React, { useEffect, useState } from "react";
import styles from "./NavBar.module.css";
// Import proper CALM logo
import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from "next/image";
import cx from "classnames";
import { outfitFont } from "@/app/styles/fonts";
import LeftArrow from "@/app/styles/icons/LeftArrow";
import FiChevronRight from "@/app/styles/icons/FiChevronRight";
import { Box, Flex, useColorMode, useDisclosure } from "@chakra-ui/react";
import GithubIcon from "@/app/styles/icons/GithubIcon";
import MoonIcon from "@/app/styles/icons/MoonIcon";

import OutlineMenuIcon from "@/app/styles/icons/OutlineMenuIcon";
import SunIcon from "@/app/styles/icons/BiSun";
import Link from "next/link";
import { useRouter } from "next/navigation";

import OutlineDrawer from "../OutlineDrawer";
import { contentManager } from "@/lib/contentManager";
import Progressbar from "../Progressbar";
import NavBarMenu from "../NavBarMenus";
import { sendGAEvent } from "@next/third-parties/google";

export default function NavBar({ urlPath }: { urlPath: string }) {
  const [pageData, setPageData] = useState<any>({});
  const [loaded, setLoaded] = useState(false);

  // Process the URL on the client side
  useEffect(() => {
    try {
      // Process the URL path client-side
      const fullUrlPath = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
      const pageMetaData = contentManager.getPageMeta(fullUrlPath);
      setPageData(pageMetaData);
      setLoaded(true);
    } catch (error) {
      console.error('Error processing path:', error);
    }
  }, [urlPath]);

  // Destructure page data after it's loaded
  const {
    chapterIndex = 0,
    chapterTitle = '',
    previousStepPath = '',
    stepIndex = 0,
    stepTitle = '',
    totalSteps = 1,
  } = pageData;

  const outline = contentManager.getOutline();
  const { colorMode, toggleColorMode } = useColorMode();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const outlineBtnRef = React.useRef(null);
  const [progress, setProgress] = useState(
    ((stepIndex + 1) / totalSteps) * 100,
  );

  useEffect(() => {
    if (loaded) {
      const newProgress = ((stepIndex + 1) / totalSteps) * 100;
      setProgress(newProgress);
    }
  }, [loaded, stepIndex, totalSteps, urlPath]);

  return (
    <div className={styles.navBar}>
      <div className={styles.leftContentWrapper}>
        <Link className={styles.logoTitle} href="/">
          <Image
            src="/icons/calm-icon.png" 
            alt="CALM Logo"
            width={32}
            height={32}
          />
          <div className={cx(styles.title, outfitFont.className)}>
            A Tour of CALM
          </div>
        </Link>
        <div className={styles.contentNavigation}>
          <button
            className={styles.backBtn}
            onClick={() => {
              sendGAEvent("event", "buttonClicked", {
                value: "back navigation",
              });
              if (previousStepPath) {
                router.push("/" + previousStepPath);
              } else {
                router.push("/");
              }
              // Prevent default behavior
              return false;
            }}
          >
            <LeftArrow colorMode={colorMode} />
          </button>
          <Flex
            dir="row"
            align="center"
            gap={"8px"}
            onClick={() => {
              onOpen();
              sendGAEvent("event", "buttonClicked", {
                value: "Outline Drawer (from breadcrumb)",
              });
            }}
            cursor={"pointer"}
          >
            <div className={styles.chapterTitle}>
              Chapter {chapterIndex + 1}: {chapterTitle}
            </div>
            <div className={styles.breadcrumbIcon}>
              <FiChevronRight colorMode={colorMode} />
            </div>
            <div className={styles.lessonTitle}>
              Lesson {stepIndex + 1}: {stepTitle}
            </div>
          </Flex>
        </div>
      </div>
      <div className={styles.rightContentWrapper}>
        <Link
          href="https://github.com/finos/architecture-as-code"
          target="_blank"
          onClick={() => {
            sendGAEvent("event", "buttonClicked", {
              value: "Github Link",
            });
          }}
        >
          <button className={styles.menuButton}>
            <GithubIcon colorMode={colorMode} />
          </button>
        </Link>
        <button
          className={styles.menuButton}
          onClick={() => {
            toggleColorMode();
            sendGAEvent("event", "buttonClicked", {
              value: "Theme Toggle",
            });
          }}
        >
          {colorMode === "light" ? (
            <SunIcon colorMode={colorMode} />
          ) : (
            <MoonIcon colorMode={colorMode} />
          )}
        </button>
        {/* menu */}
        <NavBarMenu />
        <button
          className={styles.menuButton}
          onClick={() => {
            onOpen();
            sendGAEvent("event", "buttonClicked", {
              value: "Outline Drawer",
            });
          }}
          ref={outlineBtnRef}
        >
          <OutlineMenuIcon colorMode={colorMode} />
        </button>
        <OutlineDrawer
          btnRef={outlineBtnRef}
          isOpen={isOpen}
          onClose={onClose}
          outline={outline}
          activeChapterIndex={chapterIndex}
          activeStepIndex={stepIndex}
        />
      </div>
      <Box pos={"absolute"} width={"100%"} bottom={0} left={0}>
        <Progressbar progress={progress} />
      </Box>
    </div>
  );
}
