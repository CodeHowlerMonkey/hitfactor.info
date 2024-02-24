import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const devApiProxy = {
  proxy: {
    "/api": {
      target: "http://localhost:3333",
      changeOrigin: false,
      secure: false,
      ws: false,
      configure: (proxy, _options) => {
        console.log("trying to configure proxy");
        proxy.on("error", (err, _req, _res) => {
          console.log("proxy error", err);
        });
        proxy.on("proxyReq", (proxyReq, req, _res) => {
          console.log("Sending Request to the Target:", req.method, req.url);
        });
        proxy.on("proxyRes", (proxyRes, req, _res) => {
          console.log(
            "Received Response from the Target:",
            proxyRes.statusCode,
            req.url
          );
        });
      },
    },
  },
};

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
        },
      },
    };
  }

  return commonConfig;
});
