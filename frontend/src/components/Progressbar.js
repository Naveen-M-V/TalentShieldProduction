// src/components/ProgressBar.js
export default function ProgressBar({ completed, steps, totalSteps }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm">Account Setup Progress: {completed}% Completed</span>
        <span className="text-sm">{steps} of {totalSteps} steps completed</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-green-600 h-3 rounded-full"
          style={{ width: `${completed}%` }}
        />
      </div>
    </div>
  );
}
