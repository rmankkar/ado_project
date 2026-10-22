import { useReportData } from '../hooks/useReport.js';
import { StatusPieChart } from './StatusPieChart.js';
import { InfoAlert } from './ErrorAlert.js';
import { formatDateTime } from '../utils/formatters.js';

export function ReportDashboard({ onBack }: { onBack: () => void }) {
  const {
    featureStatusCounts,
    featureReports,
    totalFeatures,
    totalChildStories,
    generatedAt,
  } = useReportData();

  const hasData = totalFeatures > 0 || totalChildStories > 0;

  if (!hasData) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📈</div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">No Data for Report</h2>
          <p className="text-neutral-500 mb-6 max-w-md mx-auto">
            Please fetch Features and their child User Stories first, then click 'Get Report' to generate the dashboard.
          </p>
          <button onClick={onBack} className="btn-primary">
            Back to Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Status Report</h1>
          <p className="text-neutral-500 mt-1">
            Generated on {formatDateTime(generatedAt)} • {totalFeatures} Feature(s) • {totalChildStories} Child User Story(s)
          </p>
        </div>
        <button onClick={onBack} className="btn-secondary">
          ← Back to Tables
        </button>
      </div>

      {/* Feature Status Pie Chart */}
      <StatusPieChart
        title="Feature Status Distribution"
        data={featureStatusCounts}
        total={totalFeatures}
        height={300}
      />

      {/* Child User Story Board Column Pie Charts - one per Feature */}
      {featureReports.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-neutral-900">Child User Story Board Column by Feature</h2>
          <div className="grid gap-6 grid-cols-1">
            {featureReports.map(report => (
              <StatusPieChart
                key={report.feature.id}
                title={`${report.feature.id}: ${report.feature.title}`}
                data={report.boardColumnCounts}
                total={report.totalChildStories}
                height={280}
              />
            ))}
            {featureReports.some(r => r.totalChildStories === 0) && (
              <InfoAlert
                message="Some Features have no child User Stories and are not shown in charts above."
                type="info"
              />
            )}
          </div>
        </div>
      )}

      {featureReports.length === 0 && totalFeatures > 0 && (
        <InfoAlert
          message="No child User Stories found for any Feature. Fetch child stories first to see per-Feature breakdown."
          type="info"
        />
      )}
    </div>
  );
}