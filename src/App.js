import React, { useState, useEffect } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartOptions, ArcElement } from 'chart.js';
import ChartAnnotation from 'chartjs-plugin-annotation';
import './App.css';

// Register the required Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartAnnotation, ArcElement);

const EmissionModel = () => {
  const [sandboxMode, setSandboxMode] = useState(false);
  const [budget] = useState(1016); // Total budget in million €
  const [showResults, setShowResults] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [allocations, setAllocations] = useState({
    HeavyRail: 293,
    BusImprovements: 176,
    EvInfrastructure: 100,
    DomesticAviation: 36,
  });
  const [biofuels, setBiofuels] = useState(false);
  const [workFromHome, setWorkFromHome] = useState(false);
  const [congestionCharge, setCongestionCharge] = useState(0); // Default €12
  const [bevGrants, setBevGrants] = useState(3500); // Default €3500

  // Default: €100 million for EV infrastructure = 2400 charging points
  const defaultEvInfrastructure = 100;  // in million €
  const defaultChargingPoints = 2400; // Default number of charging points

  // Calculate the number of charging points based on the EV infrastructure allocation
  const calculateChargingPoints = () => {
    return Math.round((allocations.EvInfrastructure / defaultEvInfrastructure) * defaultChargingPoints);
  };

  const chargingPoints = calculateChargingPoints();

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const adminCosts = totalAllocated * 0.1; // Admin costs = 10% of total policy budget
  const chargingPointsCost = chargingPoints * 2000 / 1000000; // Cost in million € (chargingPoints * €2000, divided by 1 million)
  const totalCostWithoutBevGrant = totalAllocated + adminCosts + chargingPointsCost; // Total cost without BEV Grant

  // Calculate Number of BEVs based on BEV Grant, capped at 10000 €
  const calculateNumberOfBEVs = () => {
    const cappedBevGrant = Math.min(bevGrants, 10000); // Cap the BEV Grant at 500,000 €
    const numberOfBevs = (cappedBevGrant / 3500) * 73000; // Calculate BEVs
    return numberOfBevs;
  };

  const numberOfBEVs = calculateNumberOfBEVs();

  // Calculate the cost for the BEV Grant
  const bevGrantCost = bevGrants * numberOfBEVs / 1000000 / 2; // Convert BEV Grant * Number of BEVs to million € / 2 (not everyone gets the grant)
  
  // Ideal ratio of BEVs to charging points
  const idealRatio = 67000 / 2400; // 28 BEVs per charging point
  const actualRatio = numberOfBEVs / chargingPoints; // Actual ratio

  // Calculate if the current ratio is within 20% of the ideal ratio
  const lowerBound = idealRatio * 0.8; // 20% below the ideal ratio
  const upperBound = idealRatio * 1.2; // 20% above the ideal ratio

  const isIdealRatio = actualRatio >= lowerBound && actualRatio <= upperBound;

  // Add the Biofuels cost if Biofuels is selected
  const biofuelsCost = biofuels ? 100 : 0; // Biofuels cost €100 million

  // Calculate total cost including BEV Grant cost and Biofuels cost
  const totalCost = totalCostWithoutBevGrant + bevGrantCost + biofuelsCost; // Total cost including the BEV Grant and Biofuels

  // If the total cost exceeds the budget, enforce the limit
  const isOverBudget = totalCost > (sandboxMode ? Infinity : budget);
  const validTotalCost = isOverBudget ? (sandboxMode ? "∞" : budget) : totalCost;

  // Emissions calculation with added policies
  const calculateEmissions = () => {
    let baselineEmissions = 18;

    const impact = {
      HeavyRail: (allocations.HeavyRail / 293) * (0.13 - 0.05),
      BusImprovements: (allocations.BusImprovements / 176) * (0.40 - 0.08),
      EvInfrastructure: (allocations.EvInfrastructure / 100) * (6.73 - 3.74),
      hgv: (allocations.EvInfrastructure / 100) * (2.91 - 2.62),
      lgv: (allocations.EvInfrastructure / 100) * (1.00 - 0.78),
      DomesticAviation: 0, // No impact
    };

    const totalImpact = Object.values(impact).reduce((a, b) => a + b, 0);

    let totalEmissions = baselineEmissions - totalImpact;
    if (biofuels) {
      totalEmissions *= 0.87; // 13% reduction for Biofuels
    }
    if (workFromHome) {
      totalEmissions *= 0.9865; // 1.35% reduction for Work From Home
    }

    if (congestionCharge > 0) {
      const congestionImpact = (congestionCharge / 12) * 0.14;
      totalEmissions *= (1 - congestionImpact);
    }

    const bevGrantImpact = bevGrants / 3500 * 0.5;
    totalEmissions -= bevGrantImpact;

    const chargingPointImpact = (chargingPoints - 2400) * 0.0005;
    totalEmissions -= chargingPointImpact;

    return totalEmissions;
  };

  const calculateSectorEmissions = () => {
  // Baseline emissions for each sector (this is where emissions would be before reductions)
  const baselineEmissions = {
    HeavyRail: 0.13, // Baseline emissions (in Mt CO₂ eq)
    BusImprovements: 0.40,
    EvInfrastructure: 6.73,
    hgv: 2.91,
    lgv: 1.00,
    DomesticAviation: 0.02, // No impact
	Other: 1.99
  };

  // The impact reduction (in Mt CO₂ eq) for each sector
  const emissionReductions = {
    HeavyRail: (allocations.HeavyRail / 293) * (0.13 - 0.05), // Reduction from baseline emissions
    BusImprovements: (allocations.BusImprovements / 176) * (0.40 - 0.08),
	
    // Special formula for EV Infrastructure
    EvInfrastructure: 6.73 + (4.73 * (Math.exp(-0.0024 * allocations.EvInfrastructure))) * -1,
    
    hgv: (allocations.EvInfrastructure / 100) * (2.91 - 2.62),
    lgv: (allocations.EvInfrastructure / 100) * (1.00 - 0.78),
    DomesticAviation: 0, // No impact
  };

  // Now, calculate actual emissions by subtracting the reductions from the baseline emissions
  const sectorEmissions = {
    HeavyRail: baselineEmissions.HeavyRail - emissionReductions.HeavyRail,
    BusImprovements: baselineEmissions.BusImprovements - emissionReductions.BusImprovements,
    EvInfrastructure: baselineEmissions.EvInfrastructure - emissionReductions.EvInfrastructure,
    hgv: baselineEmissions.hgv - emissionReductions.hgv,
    lgv: baselineEmissions.lgv - emissionReductions.lgv,
    DomesticAviation: baselineEmissions.DomesticAviation - emissionReductions.DomesticAviation,
  };

  return sectorEmissions;
};

const calculateSectorReductions = () => {
  // Baseline emissions for each sector (this is where emissions would be before reductions)
  const baselineEmissions = {
    HeavyRail: 0.13, // Baseline emissions (in Mt CO₂ eq)
    BusImprovements: 0.40,
    EvInfrastructure: 6.73,
    hgv: 2.91,
    lgv: 1.00,
    DomesticAviation: 0.02, // No impact
	Other: 1.99
  };

  // The impact reduction (in Mt CO₂ eq) for each sector
  const emissionReductions = {
    HeavyRail: (allocations.HeavyRail / 293) * (0.13 - 0.05), // Reduction from baseline emissions
    BusImprovements: (allocations.BusImprovements / 176) * (0.40 - 0.08),
	
    // Special formula for EV Infrastructure
    EvInfrastructure: 6.73 + (4.73 * (Math.exp(-0.0024 * allocations.EvInfrastructure))) * -1,
    
    hgv: (allocations.EvInfrastructure / 100) * (2.91 - 2.62),
    lgv: (allocations.EvInfrastructure / 100) * (1.00 - 0.78),
    DomesticAviation: 0, // No impact
  };

  // Now, calculate actual emissions by subtracting the reductions from the baseline emissions
  const sectorEmissions = {
    HeavyRail: emissionReductions.HeavyRail,
    BusImprovements: emissionReductions.BusImprovements,
    EvInfrastructure: emissionReductions.EvInfrastructure,
    hgv: emissionReductions.hgv,
    lgv: emissionReductions.lgv,
    DomesticAviation: emissionReductions.DomesticAviation,
  };

  return sectorEmissions;
};

  const sectorImpact = calculateSectorEmissions();
  
  const sectorReduction = calculateSectorReductions();

  // Pie chart data
  const pieData = {
    labels: [
      "Heavy Rail",
      "Bus Fleet",
      "Light Vehicles",
      "Heavy Goods Vehicles",
      "Light Goods Vehicles",
      "Domestic Aviation"
    ],
    datasets: [
      {
        data: Object.values(sectorImpact),
        backgroundColor: ["#4caf50", "#2196f3", "#f44336", "#ff9800", "#9c27b0", "#3f51b5"],
      },
    ],
  };

  // Bar chart data for 2030 Projection
  const barData = {
    labels: ["2030 Projection - Your Policies"],
    datasets: [
      {
        label: "Emissions (Mt CO₂ eq)",
        data: [calculateEmissions()],
        backgroundColor: "#f44336",
      },
    ],
  };
  
  const barData2 = {
    labels: ["2030 Projection - Original Policies"],
    datasets: [
      {
        label: "Emissions (Mt CO₂ eq)",
        data: [13.6],
        backgroundColor: "#2196f3",
      },
    ],
  };

  // Chart options for the bar chart (2030 Projection)
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        enabled: true,
      },
      annotation: {
        annotations: {
          targetLine: {
            type: 'line',
            yMin: 6.10,
            yMax: 6.10,
            borderColor: 'green',
            borderWidth: 3, // Increased thickness
            borderDash: [6, 6], // Dashed line for visibility
            label: {
              content: '2030 Target: 6.1 Mt CO₂ eq',
              position: 'start', // Moves the label above the line
              enabled: true,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              font: {
                size: 12,
                weight: 'bold',
              },
            },
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 15,
        title: {
          display: true,
          text: 'Emissions (Mt CO₂ eq)',
        },
      },
    },
  };
  

  // Function to handle slider changes
  const handleSliderChange = (key, value) => {
	  if (!isSubmitted) {
    const newAllocations = { ...allocations, [key]: value };
    setAllocations(newAllocations);
	  }
  };

  const emissions = calculateEmissions();
  const targetEmissions = 6.10; // 2030 Target

  // Placeholder descriptions for tooltips
  const tooltips = {
    HeavyRail: "This policy allocates funds for improving heavy rail infrastructure to reduce emissions from transport.",
    BusImprovements: "This policy focuses on enhancing bus services and infrastructure to decrease the overall carbon footprint.",
    EvInfrastructure: "This policy enhances electric vehicle infrastructure, like charging points, to reduce emissions from transportation.",
    DomesticAviation: "This policy addresses the emissions from domestic aviation, aiming for more sustainable aviation practices.",
    biofuels: "Select this to reduce emissions by introducing biofuels, with a 13% emissions reduction.",
    workFromHome: "Select this to reduce emissions by promoting remote work, with a 1.35% emissions reduction.",
    congestionCharge: "Adjust the congestion charge to reduce emissions by discouraging excessive traffic in urban areas.",
    bevGrants: "Enter the BEV grant amount to reduce emissions by incentivizing the purchase of electric vehicles."
  };
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  
  useEffect(() => {
    // Check if the user has already submitted the model
    if (localStorage.getItem("hasSubmitted") === "true") {
      setPasswordRequired(true);
    }
  }, []);

  const handleSubmitProposal = () => {
	setIsSubmitted(true);
    setCurrentStep(0);  // Reset step
    setShowPopup(true);  // Show the first popup
	// Store submission flag to block refresh retries
    localStorage.setItem("hasSubmitted", "true");
    alert("Emissions model submitted! Refreshing will require a password.");
	setShowResults(true);
  };
  
  const handlePasswordSubmit = () => {
    if (password === "password123") {
      localStorage.removeItem("hasSubmitted"); // Reset restriction
      setIsAuthenticated(true);
      setPasswordRequired(false);
      alert("Access granted! You can retry now.");
    } else {
      alert("Incorrect password. Try again.");
    }
  };

  const handleNextPopup = () => {
    if (currentStep < Object.keys(allocations).length - 1) {
      setCurrentStep(currentStep + 1); // Show next policy pop-up
    } else {
      setShowPopup(false); // Close all pop-ups when done
    }
  };

  const getPopupMessage = (policy) => {
  const defaultValues = {
    HeavyRail: 293,
    BusImprovements: 176,
    EvInfrastructure: 100,
    DomesticAviation: 36,
  };
  
  const currentValue = allocations[policy];
  const defaultValue = defaultValues[policy];

  // Return specific message based on the policy
  switch (policy) {
    case 'HeavyRail':
      if (currentValue === defaultValue) {
        return `You’ve allocated €${currentValue.toLocaleString()} million to Heavy Rail, which is the default amount. Major projects funded by this investment include the DART+ Programme and MetroLink.`;
      }
      return currentValue > defaultValue
        ? `You’ve allocated more than the default amount (€${defaultValue.toLocaleString()} million) for Heavy Rail. This will expedite the DART+ Programme and MetroLink projects. Perhaps Dublin will one day have a subway in our lifetimes.`
        : `You’ve allocated less than the default amount (€${defaultValue.toLocaleString()} million) for Heavy Rail. Without this funding, the DART+ Programme will be stifled, preventing 100km of line expansion. The MetroLink will also likely be delayed...again.`;

    case 'BusImprovements':
      if (currentValue === defaultValue) {
        return `You’ve allocated €${currentValue.toLocaleString()} million to Bus Improvements, which matches the default allocation. This ensures bus services continue to improve, notably with the BusConnects programme in the Five Cities (Dublin, Cork, Galway, Limerick, Waterford).`;
      }
      return currentValue > defaultValue
        ? `You’ve allocated more than the default amount (€${defaultValue.toLocaleString()} million) for Bus Improvements. This will boost accessibility, service quality, and expedite the move to fully electric buses by 2030.`
        : `You’ve allocated less than the default amount (€${defaultValue.toLocaleString()} million) for Bus Improvements. The BusConnects programme in the Five Cities (Dublin, Cork, Galway, Limerick, Waterford) will be slower to deploy, and service quality may falter along existing routes.`;

    case 'EvInfrastructure':
      if (currentValue === defaultValue) {
        return `You’ve allocated €${currentValue.toLocaleString()} million to Electric Vehicle Infrastructure, which is in line with the current Department strategy. Chargers are expected every 60km on major roads.`;
      }
      return currentValue > defaultValue
        ? `You’ve allocated more than the default amount (€${defaultValue.toLocaleString()} million) for EV Infrastructure. While a boon for current EV drivers and an incentive for prospective EV drivers, the impact on Ireland's energy grid will likely be substaintial to accomodate upwards of 5,000 charging points.`
        : `You’ve allocated less than the default amount (€${defaultValue.toLocaleString()} million) for EV Infrastructure. The Department's target to have 1 in 3 private cars be EVs by 2030 now seems awfully far-fetched.`;

    case 'DomesticAviation':
      if (currentValue === defaultValue) {
        return `You’ve allocated €${currentValue.toLocaleString()} million to Domestic Aviation, which aligns with the default value. This helps maintain domestic flight routes, such as those from Dublin to Shannon, Cork or Knock.`;
      }
      return currentValue > defaultValue
        ? `You’ve allocated more than the default amount (€${defaultValue.toLocaleString()} million) for Domestic Aviation. While this supports the sector, the emissions impact of domestic aviation is negligable at best. The Department of Transport could put the money towards encouraging private airlines like Ryanair to adopt more sustainable practices.`
        : `You’ve allocated less than the default amount (€${defaultValue.toLocaleString()} million) for Domestic Aviation. While the emissions from Ireland's domestic aviation are negligable at best, the sector still needs funds for maintenance, administration, and promotion of sustainable practices.`;

    default:
      return "There is no allocation defined for this policy.";
  }
};


  return (
    <div className="container">
      {/* Left panel for the policies */}
      <div className="left-panel">
        <h1>Transport Emissions Micro-World</h1>
		<h3>By Kevin Morley</h3>
		<button onClick={() => setSandboxMode(!sandboxMode)}>
          {sandboxMode ? 'Disable Sandbox Mode' : 'Enable Sandbox Mode'}
        </button>
        <p>Annual Budget: €{sandboxMode ? '∞' : budget.toLocaleString()} million</p>
        <p>Total Cost: €{totalCost.toLocaleString()} million</p>
		{/* Budget Status */}
        <div style={{ marginTop: '10px', fontSize: '18px', color: isOverBudget ? 'red' : 'green' }}>
          {isOverBudget ? '❌ Over Budget' : '✅ Within Budget'}
          {sandboxMode ? ' - Sandbox Mode On' : ''}
        </div>
		<br></br>
        {/* Policy Sliders with unique tooltips */}
        {Object.keys(allocations).map((key) => (
          <div key={key}>
            <label title={tooltips[key]}>
              {key.replace(/([A-Z])/g, " $1")}
            </label>
            <input
              type="range"
              min="0"
              max="300" // Expanded range
              value={allocations[key]}
              onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
              title={tooltips[key]} // Set unique tooltip
			  disabled={isSubmitted} // Freezes input when submitted
            />
            €{allocations[key].toLocaleString()} million
          </div>
        ))}

        {/* Biofuels and Work From Home Checkboxes with unique tooltips */}
        <div>
          <label>
            <input
              type="checkbox"
              checked={biofuels}
              onChange={() => setBiofuels(!biofuels)}
              title={tooltips.biofuels}
            />
            Biofuels (13% emissions reduction, €100 million cost)
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={workFromHome}
              onChange={() => setWorkFromHome(!workFromHome)}
              title={tooltips.workFromHome}
            />
            Work From Home (1.35% emissions reduction)
          </label>
        </div>

        <div>
          <label title={tooltips.congestionCharge}>
            Congestion Charge (€{congestionCharge.toLocaleString()}):
          </label>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={congestionCharge}
            onChange={(e) => setCongestionCharge(parseInt(e.target.value))}
			disabled={isSubmitted} // Freezes input when submitted
          />
        </div>

        <div>
          <label title={tooltips.bevGrants}>
            BEV Grant (€):
            <input
              type="number"
              min="0"
              max="10000"
              step="10"
              value={bevGrants}
              onChange={(e) => setBevGrants(Math.min(10000, Math.max(0, parseInt(e.target.value))))}
			  disabled={isSubmitted} // Freezes input when submitted
            />
          </label>
        </div>

        {/* New Number of BEVs */}
        <div>
          <p>Number of BEVs in Ireland: {Math.floor(numberOfBEVs).toLocaleString()}</p>
        </div>
		
		{/* Display the ratio between BEVs and charging points with the checkmark or X */}
        <div style={{ fontSize: '18px', marginTop: '10px' }}>
          {isIdealRatio ? (
            <span style={{ color: 'green' }}>✅ Within 20% of ideal Ratio (~28 BEVs per charging point)</span>
          ) : (
            <span style={{ color: 'red' }}>❌ Not within 20% of ideal Ratio (~28 BEVs per charging point)</span>
          )}
        </div>

        <div>
          <p>Number of Charging Points: {chargingPoints.toLocaleString()}</p>
        </div>

        
      </div>
	  
      {/* Right panel for the charts */}
	  {showResults && (
      <div className="right-panel">
        {/* Bar Chart - 2030 Projection */}
        <Bar data={barData2} options={barOptions} />
        <Bar data={barData} options={barOptions} />

        {/* Pie Chart - Emissions by Sector */}
        <Pie data={pieData} />
      </div>
	  )}

      {/* Projected Emissions and Target Emissions */}
	  {showResults && (
      <div className="emissions-summary">
        <h3>Emissions Summary</h3>
        <h4>Projected Emissions: {emissions.toFixed(2)} Mt CO₂ eq</h4>
        <h4>Target Emissions (2030): {targetEmissions} Mt CO₂ eq</h4>
        {emissions <= targetEmissions ? (
          <p style={{ color: 'green' }}>✅ Successfully under target emissions!</p>
        ) : (
          <p style={{ color: 'red' }}>❌ Still over target emissions!</p>
        )}
		<h4>Reductions by Sector:</h4>
		  <ul>
			{Object.keys(sectorImpact).map((sector) => (
			  <li key={sector}>
				<strong>{sector.replace(/([A-Z])/g, " $1")}</strong>: 
				{sectorReduction[sector].toFixed(2)} Mt CO₂ eq
			  </li>
			))}
		  </ul>
      </div>
	  )}
      <div className="submit-button">
      {passwordRequired && !isAuthenticated ? (
        <div>
          <p>Enter the password to retry:</p>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button onClick={handlePasswordSubmit}>Submit</button>
        </div>
      ) : (
       <button
		  onClick={handleSubmitProposal}
		  disabled={isOverBudget || !isIdealRatio}
		  className={isOverBudget || !isIdealRatio ? 'disabled' : ''}
		>
		  Submit Budget Proposal
		</button>
      )}
	  
    </div>
	  {/* Popup UI */}
      {showPopup && (
        <div className="popup">
          <h2>{Object.keys(allocations)[currentStep]}</h2>
          <p>{getPopupMessage(Object.keys(allocations)[currentStep])}</p>
          <button onClick={handleNextPopup}>Next</button>
        </div>
      )}
    </div>
  );
};

export default EmissionModel;
