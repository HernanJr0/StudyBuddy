import type { StudyPack } from "../../core";
import { tCommon } from "../../core";
import { t } from "./messages";

export function SummaryView({ pack }: { pack: StudyPack }) {
  return (
    <div class="flex flex-col gap-6">
      <section class="flex flex-col gap-2" aria-labelledby="sb-overview">
        <h2 id="sb-overview" class="text-xl font-bold">
          {t("overview")}
        </h2>
        <p class="whitespace-pre-line">{pack.summary.overview}</p>
      </section>
      <section class="flex flex-col gap-2" aria-labelledby="sb-keypoints">
        <h2 id="sb-keypoints" class="text-xl font-bold">
          {t("keyPoints")}
        </h2>
        <ul class="flex list-disc flex-col gap-2 pl-6">
          {pack.summary.keyPoints.map((kp, i) => (
            <li key={i}>
              {kp.text}{" "}
              <span class="whitespace-nowrap text-muted">
                ({tCommon("pageShort", { n: kp.page })})
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
