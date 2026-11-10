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

export function navigateToPath(path: string): void {
  if (isFileRoute()) {
    // Fragment navigation is supported by file:// and does not reload the app.
    window.location.hash = path;
    return;
  }
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function replacePath(path: string): void {
  if (isFileRoute()) {
    // Replace only the fragment so Electron stays on the loaded index.html.
    window.location.replace(`#${path}`);
    return;
  }
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function navigateToRouteAnchor(anchor: string): void {
  if (isFileRoute()) {
    window.location.hash = `${getCurrentPathname()}#${anchor}`;
    document.getElementById(anchor)?.scrollIntoView({ block: "start" });
    return;
  }
  window.location.hash = anchor;
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
  const segment = pathname.replace(/^\/+/, "").split("/")[0];
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
