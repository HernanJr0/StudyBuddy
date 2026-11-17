import { render } from "preact";
import "./styles.css";
import { registerPwa } from "./pwa";
import { store } from "./store";
import { applyFontScale, applyTheme } from "./ui/kit";
import { App } from "./ui/shell/App";

const settings = store.getSettings();
applyTheme(settings.theme);
applyFontScale(settings.fontScale);

const root = document.getElementById("app");
if (root) render(<App />, root);
registerPwa();
