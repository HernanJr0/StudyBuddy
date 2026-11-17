/**
 * Casca da aplicação: layout, rotas (hash) e páginas. As telas de estudo
 * (PackScreen) vêm de ui/study; o restante fica em ui/shell.
 */
import { useEffect } from "preact/hooks";
import { HistoryPage } from "./HistoryPage";
import { HomePage } from "./HomePage";
import { Layout } from "./Layout";
import { lazyPage } from "./lazy";
import { ExamplePage, OpenLinkPage } from "./OpenLinkPage";
import { handleOAuthReturn } from "./openrouterAuth";
import { type Route, useRoute } from "./router";
import { NotFoundPage } from "./TextPages";

// Páginas fora do caminho inicial são carregadas sob demanda (orçamento de 80 KB).
const PackScreen = lazyPage(() => import("../study").then((m) => m.PackScreen));
const ReviewPage = lazyPage(() => import("../review").then((m) => m.ReviewPage));
const SettingsPage = lazyPage(() => import("./SettingsPage").then((m) => m.SettingsPage));
const Showcase = lazyPage(() => import("../kit/Showcase").then((m) => m.Showcase));
const GuidePage = lazyPage(() => import("./TextPages").then((m) => m.GuidePage));
const PrivacyPage = lazyPage(() => import("./TextPages").then((m) => m.PrivacyPage));
const AboutPage = lazyPage(() => import("./TextPages").then((m) => m.AboutPage));

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case "home":
      return <HomePage />;
    case "settings":
      return <SettingsPage />;
    case "history":
      return <HistoryPage />;
    case "pack":
      return <PackScreen packId={route.id} tab={route.tab} />;
    case "open":
      return <OpenLinkPage payload={route.payload} />;
    case "example":
      return <ExamplePage />;
    case "kit":
      return <Showcase />;
    case "aiGuide":
      return <GuidePage />;
    case "privacy":
      return <PrivacyPage />;
    case "about":
      return <AboutPage />;
    case "review":
      return <ReviewPage />;
    case "notFound":
      return <NotFoundPage />;
  }
}

export function App() {
  const route = useRoute();
  useEffect(() => {
    void handleOAuthReturn();
  }, []);
  return (
    <Layout route={route}>
      <Page route={route} />
    </Layout>
  );
}
