export default function FeatureCard({
    icon,
    title,
    description,
    value,
    variant = "surface",
  }) {
    return (
      <div className={`feature-card feature-${variant}`}>
  
        <div className="feature-icon">
          {icon}
        </div>
  
        <h3 className="feature-title">
          {title}
        </h3>
  
        <p className="feature-description">
          {description}
        </p>
  
        {value && (
          <div className="feature-value">
            {value}
          </div>
        )}
  
        {!value && (
          <div className="feature-arrow">
            →
          </div>
        )}
  
      </div>
    );
  }