/**
 * Casca da aplicação: layout, rotas (hash) e páginas. As telas de estudo
 * (PackScreen) vêm de ui/study; o restante fica em ui/shell.
 */
import { useEffect } from "preact/hooks";
import { Showcase } from "../kit/Showcase";
import { ReviewPage } from "../review";
import { PackScreen } from "../study";
import { HistoryPage } from "./HistoryPage";
import { HomePage } from "./HomePage";
import { Layout } from "./Layout";
import { ExamplePage, OpenLinkPage } from "./OpenLinkPage";
import { handleOAuthReturn } from "./openrouterAuth";
import { type Route, useRoute } from "./router";
import { SettingsPage } from "./SettingsPage";
import { AboutPage, GuidePage, NotFoundPage, PrivacyPage } from "./TextPages";

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
