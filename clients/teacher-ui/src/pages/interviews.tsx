import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useInterviews } from '../hooks';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import { InterviewSession } from '../types';
import { formatDate, formatDateTime, getStatusColor, getDifficultyColor } from '../utils/helpers';

const InterviewsPage: React.FC = () => {
  const { user } = useAuth();
  const { interviews, loading, createInterview, updateInterview, deleteInterview } = useInterviews();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewSession | null>(null);
  const [editingInterview, setEditingInterview] = useState<InterviewSession | null>(null);
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

  const handleEditInterview = async (formData: any) => {
    if (!editingInterview) return;
    
    const result = await updateInterview(editingInterview.id, formData);
    if (result.success) {
      setShowEditModal(false);
      setEditingInterview(null);
    }
  };

  const openEditModal = (interview: InterviewSession) => {
    setEditingInterview(interview);
    setShowEditModal(true);
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
      <div className="space-y-8">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 backdrop-blur-sm"></div>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Professional Interviews
                  </h1>
                  <p className="text-emerald-100 text-lg">
                    {user?.role === 'student' 
                      ? 'Practice and track your professional interview sessions with advanced monitoring'
                      : 'Manage and conduct professional interview sessions with comprehensive evaluation'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {(user?.role === 'teacher' || user?.role === 'administrator') && (
              <Button 
                variant="gradient"
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-emerald-600 hover:bg-white/90 font-semibold shadow-lg transition-all duration-200 hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Interview
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {interviews.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {interviews.filter(i => i.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {interviews.filter(i => i.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-500 to-slate-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
                    {interviews.filter(i => i.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-3">
              {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 ${
                    filter === status
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                      : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-600 hover:from-gray-200 hover:to-slate-200 border border-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Interviews List */}
        {filteredInterviews.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onView={() => setSelectedInterview(interview)}
                onEdit={() => openEditModal(interview)}
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
            title="No professional interviews found"
            description="Get started by creating your first professional interview session with advanced monitoring and evaluation."
            action={
              (user?.role === 'teacher' || user?.role === 'administrator') ? (
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Professional Interview
                </Button>
              ) : null
            }
          />
        )}

        {/* Create Interview Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Professional Interview"
          size="lg"
        >
          <CreateInterviewForm
            onSubmit={handleCreateInterview}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>

        {/* Edit Interview Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingInterview(null);
          }}
          title="Edit Professional Interview"
          size="lg"
        >
          <CreateInterviewForm
            interview={editingInterview}
            onSubmit={handleEditInterview}
            onCancel={() => {
              setShowEditModal(false);
              setEditingInterview(null);
            }}
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
  icon: React.ReactNode;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'text-emerald-600',
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
          <div className={`${colorClasses[color as keyof typeof colorClasses]}`}>
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
            <CardTitle className="text-lg">
              {interview.title || `Professional ${interview.interview_type || interview.category || 'Technical'} Interview with ${interview.student_name || 'Student'}`}
            </CardTitle>
            <CardDescription>
              {interview.description || interview.instructions || 'Professional interview with advanced monitoring and evaluation'}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(interview.status)}`}>
              {interview.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
            </span>
            <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(interview.difficulty_level)}`}>
              {interview.difficulty_level === 'beginner' ? 'ENTRY LEVEL' :
               interview.difficulty_level === 'intermediate' ? 'MID-LEVEL' :
               interview.difficulty_level === 'advanced' ? 'SENIOR LEVEL' :
               'MID-LEVEL'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Category: {interview.category || interview.interview_type || 'General'}</span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Professional Mode
            </span>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>AI Generated: {interview.is_ai_generated ? 'Yes' : 'No'}</span>
            <span>Security: {interview.security_enabled || interview.is_secure_mode ? 'Enabled' : 'Disabled'}</span>
          </div>
          
          {(interview.scheduled_time || interview.scheduled_datetime) && (
            <div className="text-sm text-gray-600">
              <span>Scheduled: {formatDateTime(interview.scheduled_time || interview.scheduled_datetime)}</span>
            </div>
          )}
          
          {interview.overall_score !== undefined && interview.overall_score > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Score:</span>
              <span className="font-medium">
                {interview.overall_score}
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
  interview?: InterviewSession | null; // For editing
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CreateInterviewForm: React.FC<CreateInterviewFormProps> = ({ interview, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: interview?.title || interview?.interview_type || '',
    description: interview?.description || interview?.instructions || '',
    category: interview?.category || interview?.interview_type || 'technical',
    difficulty_level: interview?.difficulty_level || 'intermediate',
    is_ai_generated: interview?.is_ai_generated ?? true,
    security_enabled: interview?.security_enabled ?? interview?.is_secure_mode ?? true,
    scheduled_time: interview?.scheduled_time || interview?.scheduled_datetime || '',
    interview_type: 'professional', // Always use professional interview type
    duration_minutes: interview?.duration_minutes || interview?.duration || 60,
    instructions: interview?.instructions || interview?.description || '',
    is_secure_mode: true, // Always enable secure mode for professional interviews
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
        label="Professional Interview Title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        required
        placeholder="Enter professional interview title"
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Interview Description & Instructions
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Enter detailed instructions and context for this professional interview"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interview Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="technical">Technical Interview</option>
            <option value="behavioral">Behavioral Interview</option>
            <option value="situational">Situational Interview</option>
            <option value="coding">Coding Interview</option>
            <option value="system_design">System Design</option>
            <option value="leadership">Leadership & Management</option>
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="beginner">Entry Level</option>
            <option value="intermediate">Mid-Level</option>
            <option value="advanced">Senior Level</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Duration (minutes)"
          name="duration_minutes"
          type="number"
          value={formData.duration_minutes}
          onChange={handleChange}
          min="15"
          max="180"
          placeholder="60"
        />
        
        <Input
          label="Scheduled Time (Optional)"
          name="scheduled_time"
          type="datetime-local"
          value={formData.scheduled_time}
          onChange={handleChange}
        />
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-3">Professional Interview Settings</h4>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_ai_generated"
              checked={formData.is_ai_generated}
              onChange={handleChange}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-blue-900">
              Generate questions using AI (Recommended)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              name="security_enabled"
              checked={formData.security_enabled}
              onChange={handleChange}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-blue-900">
              Enable professional security mode (Proctoring, fullscreen, etc.)
            </label>
          </div>
        </div>
        <p className="text-xs text-blue-700 mt-2">
          Professional interviews include enhanced monitoring, secure environment, and comprehensive evaluation.
        </p>
      </div>
      
      <div className="flex space-x-3 pt-4">
        <Button type="submit" fullWidth>
          Create Professional Interview
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
      
      {interview.overall_score && interview.max_score && (
        <div>
          <span className="text-sm font-medium text-gray-900">Final Score:</span>
          <p className="text-lg font-bold text-emerald-600">
            {interview.overall_score}/{interview.max_score} 
            ({Math.round((interview.overall_score / interview.max_score) * 100)}%)
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

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
