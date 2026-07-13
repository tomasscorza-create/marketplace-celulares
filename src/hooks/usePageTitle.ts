import { useEffect } from "react";
import { marketplaceConfig } from "@/config/marketplace";

export function usePageTitle(title?: string) {
  useEffect(() => {
    if (title) {
      document.title = `${title} — ${marketplaceConfig.appName}`;
    } else {
      document.title = marketplaceConfig.appName;
    }
  }, [title]);
}
