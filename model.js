import React, { useState } from "react";
import { Bar } from "react-chartjs-2";

const EmissionModel = () => {
  const [budget, setBudget] = useState(500);
  const [allocations, setAllocations] = useState({
    evSubsidies: 0,
    publicTransport: 0,
    cyclingInfra: 0,
    roadUpgrades: 0,
  });

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);

  const handleSliderChange = (variable, value) => {
    if (totalAllocated - allocations[variable] + value <= budget) {
      setAllocations({ ...allocations, [variable]: value });
    }
  };

  const calculateEmissions = () => {
    const baseline = 20; // Baseline emissions in MtCO2
    const reductions = allocations.evSubsidies * 0.02 +
                       allocations.publicTransport * 0.03 +
                       allocations.cyclingInfra * 0.01 +
                       allocations.roadUpgrades * 0.005;
    return baseline - reductions;
  };

  const data = {
    labels: ["2030 Target", "Your Projection"],
    datasets: [
      {
        label: "Emissions (MtCO2)",
        data: [10, calculateEmissions()],
        backgroundColor: ["#4caf50", "#f44336"],
      },
    ],
  };

  return (
    <div>
      <h1>Transport Emissions Budget Model</h1>
      <p>Budget: €{budget} million</p>
      <p>Allocated: €{totalAllocated} million</p>
      
      {Object.keys(allocations).map((key) => (
        <div key={key}>
          <label>{key.replace(/([A-Z])/g, " $1")}</label>
          <input
            type="range"
            min="0"
            max="200"
            value={allocations[key]}
            onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
          />
          €{allocations[key]} million
        </div>
      ))}
      
      <Bar data={data} />
    </div>
  );
};

export default EmissionModel;
