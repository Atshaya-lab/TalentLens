import React from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { 
  ChatIcon, 
  DocumentIcon, 
  CalendarIcon,
  CheckIcon,
  ChartBarIcon
} from './ui/Icons';

interface Activity {
  id: string;
  type: 'interview' | 'resume' | 'score' | 'profile';
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'in-progress' | 'scheduled';
}

interface RecentActivityProps {
  activities: Activity[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'interview':
        return ChatIcon;
      case 'resume':
        return DocumentIcon;
      case 'score':
        return ChartBarIcon;
      default:
        return CheckIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'interview':
        return 'text-blue-600 bg-blue-50';
      case 'resume':
        return 'text-orange-600 bg-orange-50';
      case 'score':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-green-600 bg-green-50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">Your latest actions and achievements</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const IconComponent = getActivityIcon(activity.type);
            const colorClasses = getActivityColor(activity.type);
            
            return (
              <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(activity.status)}`}>
                      {activity.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            );
          })}
          
          {activities.length === 0 && (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
              <p className="text-sm text-gray-400 mt-1">Start using the platform to see your activity here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
