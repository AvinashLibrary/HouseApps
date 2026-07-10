export default function HeroSection({ onCreateGroup }) {
    return (
      <>
        <div className="hero-badge">
          <span className="badge-icon">✨</span>
          <span>FINANCIAL HARMONY AWAITS</span>
        </div>
  
        <h1 className="hero-title">
          Transform Your
          <span> Household </span>
          Finances
        </h1>
  
        <p className="hero-description">
          HouseApps helps families split expenses fairly, calculate
          contributions based on income, and build better financial habits
          together.
        </p>
  
        <div className="hero-actions">
  
          <button
            className="btn-primary hero-btn"
            onClick={onCreateGroup}
          >
            Create Your First Group
          </button>
  
          <button className="btn-secondary hero-btn">
            Learn More
          </button>
  
        </div>
  
        <div className="hero-stats">
  
          <div className="hero-stat">
            <div className="hero-stat-number">100%</div>
            <div className="hero-stat-label">
              Fair Calculations
            </div>
          </div>
  
          <div className="hero-stat">
            <div className="hero-stat-number">3</div>
            <div className="hero-stat-label">
              Budget Categories
            </div>
          </div>
  
          <div className="hero-stat">
            <div className="hero-stat-number">∞</div>
            <div className="hero-stat-label">
              Household Members
            </div>
          </div>
  
        </div>
      </>
    );
  }