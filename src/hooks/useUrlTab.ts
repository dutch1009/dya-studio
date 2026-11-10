import { useCallback, useSyncExternalStore } from "react";

function isFileRoute(): boolean {
  return window.location.protocol === "file:";
}

/**
 * Electron loads the renderer from file://. History API path changes are not
 * permitted for file URLs, so keep the document URL intact and store the
 * application route in the hash instead.
 */
export function getCurrentPathname(): string {
  if (isFileRoute()) {
    const routeHash = window.location.hash.slice(1);
    if (!routeHash.startsWith("/")) return "/";
    return routeHash.split("#", 1)[0] || "/";
  }
  return window.location.pathname;
}

/** Hash following the route separator, used for in-page anchors in file builds. */
export function getCurrentRouteAnchor(): string {
  if (!isFileRoute()) return window.location.hash.slice(1);
  const routeHash = window.location.hash.slice(1);
  const separator = routeHash.indexOf("#");
  return separator < 0 ? "" : routeHash.slice(separator + 1);
}

function routeUrl(path: string): string {
  if (isFileRoute()) {
    return `${window.location.pathname}${window.location.search}#${path}`;
  }
  return path;
}

export function navigateToPath(path: string): void {
  window.history.pushState(null, "", routeUrl(path));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function replacePath(path: string): void {
  window.history.replaceState(null, "", routeUrl(path));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function subscribeToNavigation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

export function usePathname(): string {
  return useSyncExternalStore(subscribeToNavigation, getCurrentPathname);
}

export function tabIdFromPathname(pathname: string): string {
  const segment = pathname.replace(/^\\/+/, "").split("/")[0];
  return segment === "import-export" ? "keymap" : segment || "home";
}

export function pathnameFromTabId(tabId: string): string {
  return tabId === "home" ? "/" : `/${tabId}`;
}

/**
 * Keeps the active tab in sync with the URL path (web) or hash (Electron).
 * Direct links and browser back/forward continue to work in both builds.
 */
export function useUrlTab(): [string, (tabId: string) => void] {
  const tabId = tabIdFromPathname(usePathname());

  const navigate = useCallback((nextTabId: string) => {
    navigateToPath(pathnameFromTabId(nextTabId));
  }, []);

  return [tabId, navigate];
}
