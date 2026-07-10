export default function StepCard({
    step,
    icon,
    title,
    description,
    color = "primary",
  }) {
    return (
      <div className={`step-card ${color}`}>
  
        <div className="step-icon">
          {icon}
        </div>
  
        <div className="step-label">
          {step}
        </div>
  
        <h3>
          {title}
        </h3>
  
        <p>
          {description}
        </p>
  
      </div>
    );
  }