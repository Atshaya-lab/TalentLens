'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

interface ChartProps {
  data: any[];
  className?: string;
}

interface LineChartProps extends ChartProps {
  xKey: string;
  yKey: string;
  color?: string;
  title?: string;
}

export function PerformanceLineChart({
  data,
  xKey,
  yKey,
  color = '#3B82F6',
  title,
  className = '',
}: LineChartProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarChartProps extends ChartProps {
  xKey: string;
  yKey: string;
  color?: string;
  title?: string;
}

export function SkillsBarChart({
  data,
  xKey,
  yKey,
  color = '#10B981',
  title,
  className = '',
}: BarChartProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PieChartProps extends ChartProps {
  dataKey: string;
  nameKey: string;
  title?: string;
  colors?: string[];
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

export function SkillDistributionPieChart({
  data,
  dataKey,
  nameKey,
  title,
  colors = DEFAULT_COLORS,
  className = '',
}: PieChartProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AreaChartProps extends ChartProps {
  xKey: string;
  yKey: string;
  color?: string;
  title?: string;
}

export function ProgressAreaChart({
  data,
  xKey,
  yKey,
  color = '#8B5CF6',
  title,
  className = '',
}: AreaChartProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            fill={`${color}20`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MultiLineChartProps extends ChartProps {
  xKey: string;
  lines: Array<{
    key: string;
    color: string;
    name: string;
  }>;
  title?: string;
}

export function MultiLineChart({
  data,
  xKey,
  lines,
  title,
  className = '',
}: MultiLineChartProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              name={line.name}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
