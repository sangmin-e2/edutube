import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
  { id: 0, label: '주제 입력' },
  { id: 1, label: '영상 선택' },
  { id: 2, label: '평가 선택' },
  { id: 3, label: '지도안 확인' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                  currentStep > index
                    ? 'bg-blue-600 text-white'
                    : currentStep === index
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStep > index ? <Check size={16} /> : index + 1}
              </div>
              <span
                className={`absolute top-10 text-xs font-medium w-20 text-center ${
                  currentStep >= index ? 'text-blue-700' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-24 -mt-4 transition-colors duration-300 ${
                  currentStep > index ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
