import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ThreatChartProps {
  data: {
    endpoint: number;
    email: number;
    web: number;
    cloud: number;
  };
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'];

export function ThreatChart({ data }: ThreatChartProps) {
  const chartData = [
    { name: 'Endpoint', value: data.endpoint },
    { name: 'Email', value: data.email },
    { name: 'Web', value: data.web },
    { name: 'Cloud', value: data.cloud },
  ].filter(d => d.value > 0);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        No threat data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
          />
          <Legend
            formatter={(value) => <span className="text-slate-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
