import React from "react";
import styles from "./layout.module.css";
import dynamic from "next/dynamic";

// Import the NavBar component dynamically to avoid SSR issues
const ClientNavBar = dynamic(() => import("@/app/components/NavBar"), { ssr: false });

// Define a very simple layout (server component)
export default function PageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { markdownPath: string[] };
}) {
  const urlPath = params?.markdownPath?.join("/") || "";
  
  return (
    <div className={styles.wrapper}>
      {/* The NavBar is loaded client-side */}
      <ClientNavBar urlPath={urlPath} />
      {children}
    </div>
  );
}



