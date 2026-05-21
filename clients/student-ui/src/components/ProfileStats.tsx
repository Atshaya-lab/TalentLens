import React from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { 
  ChartBarIcon, 
  ChatIcon, 
  DocumentIcon, 
  CalendarIcon,
  CheckIcon,
  TargetIcon
} from './ui/Icons';

interface ProfileStatsProps {
  stats: {
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number;
    resumesUploaded: number;
    memberSince: string;
    lastActivity: string;
  };
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Interviews',
      value: stats.totalInterviews,
      icon: ChatIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Interviews completed'
    },
    {
      title: 'Success Rate',
      value: `${Math.round((stats.completedInterviews / Math.max(stats.totalInterviews, 1)) * 100)}%`,
      icon: TargetIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Completion rate'
    },
    {
      title: 'Average Score',
      value: `${stats.averageScore.toFixed(1)}`,
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Out of 10'
    },
    {
      title: 'Resumes',
      value: stats.resumesUploaded,
      icon: DocumentIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Documents uploaded'
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <ChartBarIcon className="w-5 h-5 text-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">Your Statistics</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-700">{stat.title}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProfileStats;
