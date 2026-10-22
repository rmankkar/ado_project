import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StatusCount } from '../hooks/useReport.js';

/**
 * Semantic color mapping for common ADO work item states.
 * Extend this map for your organization's specific states.
 */
const STATUS_COLOR_MAP: Record<string, string> = {
  // Feature states
  'New': '#3b82f6',           // blue
  'Active': '#f59e0b',        // amber
  'Resolved': '#22c55e',      // green
  'Closed': '#6b7280',        // gray
  'Removed': '#ef4444',       // red
  'In Progress': '#f59e0b',   // amber
  'Done': '#22c55e',          // green
  'To Do': '#3b82f6',         // blue
  'Backlog': '#8b5cf6',       // violet
  'Committed': '#06b6d4',     // cyan

  // User Story states (common ADO Agile process)
  'New': '#3b82f6',
  'Active': '#f59e0b',
  'Resolved': '#22c55e',
  'Closed': '#6b7280',
  'Removed': '#ef4444',

  // CMMI process
  'Proposed': '#8b5cf6',
  'In Progress': '#f59e0b',
  'Complete': '#22c55e',

  // Scrum process
  'To Do': '#3b82f6',
  'Doing': '#f59e0b',
  'Done': '#22c55e',
};

// Fallback colors for unknown states
const FALLBACK_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function getStatusColor(status: string, index: number): string {
  return STATUS_COLOR_MAP[status] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

interface StatusPieChartProps {
  title: string;
  data: StatusCount[];
  total: number;
  showLegend?: boolean;
  height?: number;
}

export function StatusPieChart({ title, data, total, showLegend = true, height = 280 }: StatusPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="card p-6 text-center" role="img" aria-label={`${title}: No data available`}>
        <div className="text-3xl mb-2" aria-hidden="true">📊</div>
        <p className="text-neutral-500 text-sm">{title}</p>
        <p className="text-neutral-400 text-xs mt-1">No data available</p>
      </div>
    );
  }

  // Prepare chart data with semantic colors and percentages
  const chartData = data.map((item, index) => ({
    ...item,
    color: getStatusColor(item.status, index),
    percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : '0',
  }));

  // Custom tooltip with dark mode support
  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; payload: StatusCount & { percentage: string } }> }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div
        className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-2.5"
        style={{ minWidth: 160 }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: payload[0].color }}
            aria-hidden="true"
          />
          <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate max-w-[100px]">{item.status}</span>
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          Count: <span className="font-medium text-neutral-900 dark:text-neutral-100">{item.count}</span>
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          Percentage: <span className="font-medium text-neutral-900 dark:text-neutral-100">{item.percentage}%</span>
        </div>
      </div>
    );
  };

  // Custom legend item with color indicator
  const renderLegendItem = ({ color, value }: { color: string; value: string }) => {
    const item = chartData.find(d => d.status === value);
    if (!item) return null;
    return (
      <div
        key={value}
        className="flex items-center gap-1.5 px-1 py-0.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition-colors"
        style={{ minWidth: 160 }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate max-w-[100px]">
          {value} ({item.count})
        </span>
      </div>
    );
  };

  // Accessible label for the chart
  const chartAriaLabel = `${title}. Total: ${total}. Distribution: ${data.map(d => `${d.status}: ${d.count}`).join(', ')}`;

  return (
    <div className="card p-4" role="region" aria-label={chartAriaLabel}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-3">
        <h3 className="text-base font-semibold text-black dark:text-black truncate flex-1 min-w-0">
          {title}
        </h3>
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-1.5 shrink-0">
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{total}</div>
          <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Total Items</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Chart */}
        <div className="flex-1 min-w-0 lg:min-w-[240px]">
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={Math.min(85, height * 0.3)}
                paddingAngle={1.5}
                dataKey="count"
                nameKey="status"
                label={({ status, percentage }) => percentage !== '0.0' ? `${status} (${percentage}%)` : ''}
                labelLine={false}
              >
                {chartData.map((item, index) => (
                  <Cell key={`cell-${index}`} fill={item.color} />
                ))}
              </Pie>
              <Tooltip content={renderTooltip as any} wrapperStyle={{ outline: 'none' }} />
              {/* {showLegend && data.length <= 5 && (
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  formatter={renderLegendItem}
                />
              )} */}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Data table / Legend */}
        <div className="w-full lg:w-64 space-y-1.5 max-h-[350px] overflow-y-auto">
          {chartData.map((item, index) => (
            <div
              key={`${item.status}-${index}`}
              className="flex items-center gap-2 p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors hover:border-primary-300 dark:hover:border-primary-700"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 ring-1.5 ring-white dark:ring-neutral-800"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {item.status}
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {item.count} item{item.count !== 1 ? 's' : ''} ({item.percentage}%)
                </div>
              </div>
              <div className="text-right text-xs font-medium text-neutral-900 dark:text-neutral-100 w-16 shrink-0">
                {item.percentage}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}