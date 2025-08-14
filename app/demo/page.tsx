'use client';

import { OverviewPage } from '@/components/OverviewPage';
import { mockJobData, mockRoofMeasurements, mockRuleAnalysis } from '@/lib/mockData';
import { useState } from 'react';

export default function DemoPage() {
  const [jobData, setJobData] = useState(mockJobData);

  const handleFieldUpdate = (field: string, value: string | number) => {
    setJobData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartReview = () => {
    console.log('Starting review...');
    // In real app, this would navigate to the review page
  };

  return (
    <div className="min-h-screen">
      <OverviewPage
        jobData={jobData}
        roofMeasurements={mockRoofMeasurements}
        ruleAnalysis={mockRuleAnalysis}
        onFieldUpdate={handleFieldUpdate}
        onStartReview={handleStartReview}
      />
    </div>
  );
}