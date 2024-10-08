import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  const commonConfig = {
    plugins: [react()],
  };

  if (mode === "development") {
    return {
      ...commonConfig,
      server: {
        proxy: {
          "/api": "http://localhost:3333/",
          "/wsb": "http://localhost:3333/",
        },
      },
    };
  }

  return commonConfig;
});
