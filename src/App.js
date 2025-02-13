import React, { useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartOptions, ArcElement } from 'chart.js';
import ChartAnnotation from 'chartjs-plugin-annotation';
import './App.css';

// Register the required Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartAnnotation, ArcElement);

const EmissionModel = () => {
  const [sandboxMode, setSandboxMode] = useState(false);
  const [budget] = useState(1016); // Total budget in million €
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
    const numberOfBevs = (cappedBevGrant / 3500) * 73000/2; // Calculate BEVs
    return numberOfBevs;
  };

  const numberOfBEVs = calculateNumberOfBEVs();

  // Calculate the cost for the BEV Grant
  const bevGrantCost = bevGrants * numberOfBEVs / 1000000; // Convert BEV Grant * Number of BEVs to million €
  
  // Ideal ratio of BEVs to charging points
  const idealRatio = 36500 / 2400; // 15.21 BEVs per charging point
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


  const sectorImpact = calculateSectorEmissions();

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
    labels: ["2030 Projection"],
    datasets: [
      {
        label: "Emissions (Mt CO₂ eq)",
        data: [calculateEmissions()],
        backgroundColor: "#f44336",
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
    const newAllocations = { ...allocations, [key]: value };
    setAllocations(newAllocations);
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
            <span style={{ color: 'green' }}>✅ Within 20% of ideal Ratio (~15 BEVs per charging point)</span>
          ) : (
            <span style={{ color: 'red' }}>❌ Not within 20% of ideal Ratio (~15 BEVs per charging point)</span>
          )}
        </div>

        <div>
          <p>Number of Charging Points: {chargingPoints.toLocaleString()}</p>
        </div>

        
      </div>
	  
      {/* Right panel for the charts */}
      <div className="right-panel">
        {/* Bar Chart - 2030 Projection */}
        <Bar data={barData} options={barOptions} />

        {/* Pie Chart - Emissions by Sector */}
        <Pie data={pieData} />
      </div>

      {/* Projected Emissions and Target Emissions */}
      <div className="emissions-summary">
        <h3>Emissions Summary</h3>
        <p>Projected Emissions: {emissions.toFixed(2)} Mt CO₂ eq</p>
        <p>Target Emissions (2030): {targetEmissions} Mt CO₂ eq</p>
        {emissions <= targetEmissions ? (
          <p style={{ color: 'green' }}>✅ Successfully under target emissions!</p>
        ) : (
          <p style={{ color: 'red' }}>❌ Still over target emissions!</p>
        )}
      </div>
    </div>
  );
};

export default EmissionModel;
