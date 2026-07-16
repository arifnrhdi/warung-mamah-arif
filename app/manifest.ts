import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Warung Mamah",
    short_name: "Warung",
    description: "Aplikasi Kasir & Utang",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    icons: [
      {
        src: "/sigma.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/sigma-boy.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
