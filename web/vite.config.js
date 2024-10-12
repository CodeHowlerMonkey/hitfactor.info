import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const commonConfig = {
    plugins: [react()],
    optimizeDeps: {
      include: ["bson"],
      esbuildOptions: {
        supported: {
          "top-level-await": true,
        },
      },
    },
  };

  if (mode === "development") {
    return {
      ...commonConfig,
      server: {
        proxy: {
          "/api": "http://localhost:3000/",
          "/wsb": "http://localhost:3000/",
        },
      },
    };
  }

  return commonConfig;
});
