import '../styles/EmptyHubState.css';
import heroHouseholdImage from '../assets/images/hero-household.jpg';

/**
 * EmptyHubState — shown in HubView when groups.length === 0.
 * A light, welcoming onboarding hero, distinct from the app's dark working UI,
 * since this is the very first thing a new user sees before they're "inside" the tool.
 *
 * Usage in HubView.jsx:
 *   {groups.length === 0 && !showEditor && (
 *     <EmptyHubState onCreateGroup={handleNew} />
 *   )}
 */
export default function EmptyHubState({ onCreateGroup, onWatchDemo }) {
  return (
    <div className="ehs-root">
      <div className="ehs-hero">
        <div className="ehs-copy">
          <div className="ehs-eyebrow">
            <span className="ehs-eyebrow-spark">✦</span>
            Financial harmony awaits
          </div>

          <h1 className="ehs-headline">
          Start Your Shared <span className="ehs-headline-accent">Journey</span>
          </h1>

          <p className="ehs-sub">
          Create a shared group to start tracking expenses, calculating splits, and reaching financial goals together.
          </p>

          <div className="ehs-actions">
            <button className="ehs-btn-primary" onClick={onCreateGroup}>
              Create your first group
              <span className="ehs-arrow">→</span>
            </button>
            {onWatchDemo && (
              <button className="ehs-btn-secondary" onClick={onWatchDemo}>
                Watch demo
              </button>
            )}
          </div>
        </div>

        <div className="ehs-visual">
          <div className="ehs-photo-card">
            

            {/* <div className="ehs-photo-badge"> */}

             <img  src={require('../assets/images/hero-household.jpg')} alt="Household Hero" />
            <style>
              {`
              .ehs-photo-card img {
                width: 100%;
                height: auto;
                object-fit: cover;
                display: block;
              }
              `}
            </style>
            {/* </div> */}
          </div>

          <div className="ehs-side-cards">
            <div className="ehs-side-card ehs-side-card--accent">
              <span className="ehs-side-icon">🏛️</span>
              <div className="ehs-side-title">Salary Splitting</div>
              <div className="ehs-side-sub">Fairness based on income.</div>
            </div>
            <div className="ehs-side-card">
              <span className="ehs-side-icon">🛡️</span>
              <div className="ehs-side-title">Secure Hub</div>
              <div className="ehs-side-sub">Private for your household.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="ehs-steps">
        <h2 className="ehs-steps-title">Three steps to harmony</h2>
        <div className="ehs-steps-grid">
          <div className="ehs-step">
            <div className="ehs-step-icon ehs-step-icon--violet">👥</div>
            <div className="ehs-step-eyebrow">Step 01</div>
            <div className="ehs-step-name">Create Group</div>
            <div className="ehs-step-desc">Name your household and set your collective goals.</div>
          </div>
          <div className="ehs-step">
            <div className="ehs-step-icon ehs-step-icon--blue">➕</div>
            <div className="ehs-step-eyebrow">Step 02</div>
            <div className="ehs-step-name">Add Members</div>
            <div className="ehs-step-desc">Invite partners or roommates to join your shared space.</div>
          </div>
          <div className="ehs-step">
            <div className="ehs-step-icon ehs-step-icon--green">🐷</div>
            <div className="ehs-step-eyebrow">Step 03</div>
            <div className="ehs-step-name">Track &amp; Save</div>
            <div className="ehs-step-desc">Log expenses and let the system handle the complex math.</div>
          </div>
        </div>
      </div>
    </div>
  );
}