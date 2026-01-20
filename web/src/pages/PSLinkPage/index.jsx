import { useEffect } from "react";
import { useParams } from "react-router-dom";

const tryOpenApp = (appUri, webUrl, delay = 3000) => {
  let appOpened = false;

  // Listen for the page being hidden
  const handleVisibilityChange = () => {
    if (document.hidden || document.webkitHidden) {
      appOpened = true;
    }
  };

  window.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("webkitvisibilitychange", handleVisibilityChange);

  // Attempt to open the app
  window.location.href = appUri;

  // Check after 2 seconds if the page was never hidden
  setTimeout(() => {
    window.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("webkitvisibilitychange", handleVisibilityChange);

    if (!appOpened) {
      window.location.href = webUrl;
    }
  }, delay);
};

const PSLinkPage = () => {
  const { uuid } = useParams();
  useEffect(() => {
    if (!uuid) {
      return;
    }

    tryOpenApp(
      `pscapp://practiscore.com/results/new/${uuid}`,
      `https://practiscore.com/results/new/${uuid}`,
    );
  }, [uuid]);
  return null;
};

export default PSLinkPage;
