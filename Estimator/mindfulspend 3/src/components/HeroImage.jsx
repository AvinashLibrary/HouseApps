import heroImage from "../../assets/images/hero-household.jpg";

export default function HeroImage() {
  return (
    <div className="hero-image-layout">

      {/* Large Hero Image */}

      <div className="hero-image-card">

        <img
          src={heroImage}
          alt="Household Budget"
          className="hero-image"
        />

        {/* Floating Card */}

        <div className="floating-card">

          <div className="floating-header">

            <div className="floating-icon">
              📈
            </div>

            <div>

              <div className="floating-title">
                Live Tracking
              </div>

              <div className="floating-subtitle">
                Always Up To Date
              </div>

            </div>

          </div>

          <div className="floating-progress">

            <div className="progress-row">

              <span>Needs</span>

              <span>72%</span>

            </div>

            <div className="progress-bar">

              <div
                className="progress-fill progress-primary"
                style={{ width: "72%" }}
              />

            </div>

          </div>

        </div>

      </div>

      {/* Right Column */}

      <div className="hero-side-column">

        <div className="feature-card feature-primary">

          <div className="feature-icon">
            💰
          </div>

          <h3>
            Salary Splitting
          </h3>

          <p>
            Fair contribution calculations
            based on monthly income.
          </p>

          <div className="feature-value">
            100%
          </div>

        </div>

        <div className="feature-card feature-surface">

          <div className="feature-icon">
            🛡️
          </div>

          <h3>
            Secure Hub
          </h3>

          <p>
            Your family's financial data
            stays private and organized.
          </p>

          <div className="feature-arrow">
            →
          </div>

        </div>

      </div>

    </div>
  );
}