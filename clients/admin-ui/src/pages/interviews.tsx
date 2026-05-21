import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useInterviews } from '../hooks';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import { InterviewSession } from '../../shared/types';
import { formatDate, formatDateTime, getStatusColor, getDifficultyColor } from '../utils/helpers';

const InterviewsPage: React.FC = () => {
  const { user } = useAuth();
  const { interviews, loading, createInterview, updateInterview, deleteInterview } = useInterviews();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewSession | null>(null);
  const [filter, setFilter] = useState('all');

  const filteredInterviews = interviews.filter(interview => {
    if (filter === 'all') return true;
    return interview.status === filter;
  });

  const handleCreateInterview = async (formData: any) => {
    const result = await createInterview(formData);
    if (result.success) {
      setShowCreateModal(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Loading interviews..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
            <p className="text-gray-600">
              {user?.role === 'student' 
                ? 'Practice and track your interview sessions'
                : 'Manage and conduct interview sessions'
              }
            </p>
          </div>
          {(user?.role === 'teacher' || user?.role === 'administrator') && (
            <Button onClick={() => setShowCreateModal(true)}>
              Create Interview
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Interviews"
            value={interviews.length}
            icon="📋"
            color="blue"
          />
          <StatsCard
            title="Completed"
            value={interviews.filter(i => i.status === 'completed').length}
            icon="✅"
            color="green"
          />
          <StatsCard
            title="In Progress"
            value={interviews.filter(i => i.status === 'in_progress').length}
            icon="⏳"
            color="yellow"
          />
          <StatsCard
            title="Pending"
            value={interviews.filter(i => i.status === 'pending').length}
            icon="⏰"
            color="gray"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Interviews List */}
        {filteredInterviews.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onView={() => setSelectedInterview(interview)}
                onEdit={() => {/* TODO: Implement edit */}}
                onDelete={async () => {
                  if (confirm('Are you sure you want to delete this interview?')) {
                    await deleteInterview(interview.id);
                  }
                }}
                canEdit={user?.role !== 'student'}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No interviews found"
            description="Get started by creating your first interview session."
            action={
              (user?.role === 'teacher' || user?.role === 'administrator') ? (
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Interview
                </Button>
              ) : null
            }
          />
        )}

        {/* Create Interview Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Interview"
          size="lg"
        >
          <CreateInterviewForm
            onSubmit={handleCreateInterview}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>

        {/* Interview Details Modal */}
        {selectedInterview && (
          <Modal
            isOpen={!!selectedInterview}
            onClose={() => setSelectedInterview(null)}
            title="Interview Details"
            size="lg"
          >
            <InterviewDetails interview={selectedInterview} />
          </Modal>
        )}
      </div>
    </Layout>
  );
};

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`text-2xl ${colorClasses[color as keyof typeof colorClasses]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface InterviewCardProps {
  interview: InterviewSession;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}

const InterviewCard: React.FC<InterviewCardProps> = ({
  interview,
  onView,
  onEdit,
  onDelete,
  canEdit,
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onView}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{interview.title}</CardTitle>
            <CardDescription>{interview.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(interview.status)}`}>
              {interview.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(interview.difficulty_level)}`}>
              {interview.difficulty_level.toUpperCase()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Category: {interview.category}</span>
            <span>AI Generated: {interview.is_ai_generated ? 'Yes' : 'No'}</span>
          </div>
          
          {interview.scheduled_time && (
            <div className="text-sm text-gray-600">
              <span>Scheduled: {formatDateTime(interview.scheduled_time)}</span>
            </div>
          )}
          
          {interview.total_score && interview.max_score && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Score:</span>
              <span className="font-medium">
                {interview.total_score}/{interview.max_score} 
                ({Math.round((interview.total_score / interview.max_score) * 100)}%)
              </span>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            Created: {formatDate(interview.created_at)}
          </div>
          
          {canEdit && (
            <div className="flex space-x-2 pt-2" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" onClick={onEdit}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={onDelete}>
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface CreateInterviewFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CreateInterviewForm: React.FC<CreateInterviewFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
    difficulty_level: 'intermediate',
    is_ai_generated: true,
    security_enabled: true,
    scheduled_time: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Interview Title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        required
        placeholder="Enter interview title"
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter interview description"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="situational">Situational</option>
            <option value="coding">Coding</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level
          </label>
          <select
            name="difficulty_level"
            value={formData.difficulty_level}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>
      
      <Input
        label="Scheduled Time (Optional)"
        name="scheduled_time"
        type="datetime-local"
        value={formData.scheduled_time}
        onChange={handleChange}
      />
      
      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_ai_generated"
            checked={formData.is_ai_generated}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-900">
            Generate questions using AI
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="security_enabled"
            checked={formData.security_enabled}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-900">
            Enable anti-cheating security
          </label>
        </div>
      </div>
      
      <div className="flex space-x-3 pt-4">
        <Button type="submit" fullWidth>
          Create Interview
        </Button>
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

interface InterviewDetailsProps {
  interview: InterviewSession;
}

const InterviewDetails: React.FC<InterviewDetailsProps> = ({ interview }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{interview.title}</h3>
        <p className="text-gray-600">{interview.description}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm font-medium text-gray-900">Category:</span>
          <p className="text-sm text-gray-600">{interview.category}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-900">Difficulty:</span>
          <p className="text-sm text-gray-600">{interview.difficulty_level}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-900">Status:</span>
          <p className="text-sm text-gray-600">{interview.status}</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-900">AI Generated:</span>
          <p className="text-sm text-gray-600">{interview.is_ai_generated ? 'Yes' : 'No'}</p>
        </div>
      </div>
      
      {interview.total_score && interview.max_score && (
        <div>
          <span className="text-sm font-medium text-gray-900">Final Score:</span>
          <p className="text-lg font-bold text-blue-600">
            {interview.total_score}/{interview.max_score} 
            ({Math.round((interview.total_score / interview.max_score) * 100)}%)
          </p>
        </div>
      )}
      
      {interview.feedback && (
        <div>
          <span className="text-sm font-medium text-gray-900">Feedback:</span>
          <p className="text-sm text-gray-600 mt-1">{interview.feedback}</p>
        </div>
      )}
      
      <div className="flex space-x-3 pt-4">
        {interview.status === 'pending' && (
          <Button fullWidth>
            Start Interview
          </Button>
        )}
        {interview.status === 'completed' && (
          <Button variant="outline" fullWidth>
            View Report
          </Button>
        )}
      </div>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

export default InterviewsPage;
