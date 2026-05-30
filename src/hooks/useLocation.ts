import { useState, useEffect } from "react";

export const useLocation = () => {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    // Listen to custom navigation events too
    window.addEventListener("pushstate-event", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("pushstate-event", handleLocationChange);
    };
  }, []);

  const navigate = (to: string) => {
    window.history.pushState(null, "", to);
    // Dispatch a standard popstate event so all window listeners react instantly
    window.dispatchEvent(new Event("popstate"));
    window.dispatchEvent(new Event("pushstate-event"));
  };

  return { pathname, navigate };
};
