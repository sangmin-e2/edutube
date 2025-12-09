import React from 'react';
import { AssessmentOption } from '../types';

interface AssessmentCardProps {
  assessment: AssessmentOption;
  isSelected: boolean;
  onSelect: (assessment: AssessmentOption) => void;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({ assessment, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(assessment)}
      className={`cursor-pointer rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {assessment.id}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{assessment.title}</h3>
          <p className="mt-2 text-slate-600 leading-relaxed">{assessment.description}</p>
        </div>
      </div>
    </div>
  );
};
