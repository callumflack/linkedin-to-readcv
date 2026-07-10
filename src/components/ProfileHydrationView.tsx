import Image from "next/image";
import ArrowRight12 from "@/components/readcv/ArrowRight12";
import Profile from "@/components/readcv/Profile";
import readcvStyles from "@/components/readcv/Profile.module.css";
import { LINKS } from "@/constants/links";
import type { ReadCvData } from "@/types/readcv";
import styles from "./ProfileHydrationFlow.module.css";

export type ProfileHydrationViewModel =
  | { type: "idle" }
  | { type: "waiting"; label: string; approvalUrl?: string }
  | { type: "delivering"; label: string }
  | { type: "ready"; cv: ReadCvData }
  | { type: "error"; title: string; message: string };

type ProfileHydrationViewActions = {
  onStart?: () => void;
  onReset?: () => void;
  onCancel?: () => void;
};

type ProfileHydrationViewProps = {
  model: ProfileHydrationViewModel;
  actions?: ProfileHydrationViewActions;
};

export default function ProfileHydrationView({ model, actions }: ProfileHydrationViewProps) {
  if (model.type === "ready") {
    return <Profile cv={model.cv} />;
  }

  const isInProgress = model.type === "waiting" || model.type === "delivering";
  const isError = model.type === "error";

  return (
    <section className={readcvStyles.profile}>
      <div className={readcvStyles.profileHeader}>
        <div className={readcvStyles.profilePhoto}>
          <Image src="/harold.png" alt="Hide the Pain Harold" width={92} height={92} />
        </div>
        <div className={readcvStyles.profileInfo}>
          <h1>Own your LinkedIn profile</h1>
          <div className={`${readcvStyles.byline} ${styles.oneLineByline}`}>
            Export your LinkedIn and format it like ReadCV.
          </div>
        </div>
      </div>

      <section className={`${readcvStyles.profileSection} ${readcvStyles.about}`}>
        <h3>About</h3>
        <div className={readcvStyles.description}>
          <p>
            Personal data should be user-controlled, portable, and reusable across apps.{" "}
            <a href={LINKS.dataconnect} target="_blank" rel="noreferrer">
              Vana
            </a>{" "}
            lets you approve a verifiable data request once, so now you can render your LinkedIn as ReadCV intended.
          </p>
        </div>
      </section>

      <section className={readcvStyles.profileSection}>
        <h3>Why try it</h3>
        <div className={`${readcvStyles.contacts} ${styles.reasons}`}>
          <div className={readcvStyles.experience}>
            <div className={`${readcvStyles.year} ${styles.reasonLabel}`}>
              <span>Personal Data</span>
            </div>
            <div className={readcvStyles.experienceContent}>
              <div className={readcvStyles.title}>
                Your data stays yours. Share it with apps you like.
              </div>
            </div>
          </div>

          <div className={readcvStyles.experience}>
            <div className={`${readcvStyles.year} ${styles.reasonLabel}`}>
              <span>Grant Control</span>
            </div>
            <div className={readcvStyles.experienceContent}>
              <div className={readcvStyles.title}>Approve and revoke access anytime in Vana.</div>
            </div>
          </div>

          <div className={readcvStyles.experience}>
            <div className={`${readcvStyles.year} ${styles.reasonLabel}`}>
              <span>Portable Identity</span>
            </div>
            <div className={readcvStyles.experienceContent}>
              <div className={readcvStyles.title}>
                Turn your LinkedIn into reusable context across apps.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.ctaBlock}>
        {isError ? (
          <div className={styles.errorRow}>
            <span className={styles.errorText}>Could not load your profile</span>
            <button type="button" onClick={actions?.onReset} className={styles.primaryCta}>
              Try again
              <span className={styles.ctaArrow}>
                <ArrowRight12 />
              </span>
            </button>
          </div>
        ) : isInProgress ? (
          <button
            type="button"
            className={`${styles.primaryCta} ${styles.primaryCtaDisabled}`}
            disabled
          >
            {model.label}
          </button>
        ) : (
          <button type="button" onClick={actions?.onStart} className={styles.primaryCta}>
            Connect LinkedIn with Vana
            <span className={styles.ctaArrow}>
              <ArrowRight12 />
            </span>
          </button>
        )}
        {model.type === "waiting" && model.approvalUrl ? (
          <a
            href={model.approvalUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.secondaryCta}
          >
            Open approval
          </a>
        ) : null}
        {isInProgress ? (
          <button type="button" className={styles.cancelLink} onClick={actions?.onCancel}>
            (cancel)
          </button>
        ) : null}
      </div>
    </section>
  );
}
