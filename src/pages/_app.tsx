import type { AppProps } from "next/app";

// Keep a minimal Pages Router entry so Next emits pages-manifest.json
// alongside the App Router build when using the custom production distDir.
export default function LegacyPagesApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
