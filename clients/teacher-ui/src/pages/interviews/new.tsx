import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../utils/api';
import { User } from '../../types';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useToast } from '../../hooks';

const NewInterviewPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
    difficulty_level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    student_id: '',
    duration: 30,
    total_questions: 5,
    scheduled_time: '',
    is_ai_generated: true,
    security_enabled: false,
  });
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Load students for teachers/admins
    if (user?.role === 'teacher' || user?.role === 'administrator') {
      fetchStudents();
    }
  }, [isAuthenticated, user, router]);

  const fetchStudents = async () => {
    try {
      const response = await apiService.getUsers({ role: 'student' });
      setStudents(response.data.results);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const interviewData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficulty_level: formData.difficulty_level,
        duration: formData.duration,
        total_questions: formData.total_questions,
        is_ai_generated: formData.is_ai_generated,
        security_enabled: formData.security_enabled,
        scheduled_time: formData.scheduled_time || undefined,
        ...(user?.role !== 'student' && formData.student_id && {
          student: parseInt(formData.student_id)
        }),
      };

      const response = await apiService.createInterview(interviewData);
      showToast('Interview created successfully!', 'success');
      
      // Redirect to interviews list or start interview
      if (user?.role === 'student') {
        router.push(`/interview/${response.data.id}`);
      } else {
        router.push('/interviews');
      }
    } catch (error: any) {
      console.error('Error creating interview:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create interview';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'technical', label: 'Technical' },
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'communication', label: 'Communication' },
    { value: 'problem_solving', label: 'Problem Solving' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'general', label: 'General' },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create New Professional Interview</h1>
          <p className="mt-2 text-gray-600">
            Set up a new interview session with AI-generated questions
          </p>
        </div>

        {/* Form */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">Interview Details</h3>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Software Engineer Technical Interview"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe the interview purpose and focus areas..."
                />
              </div>

              {/* Interview Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level *
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      difficulty_level: e.target.value as 'beginner' | 'intermediate' | 'advanced'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    min="5"
                    max="180"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Questions *
                  </label>
                  <input
                    type="number"
                    value={formData.total_questions}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_questions: parseInt(e.target.value) }))}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Student Selection (for teachers/admins) */}
              {(user?.role === 'teacher' || user?.role === 'administrator') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Student
                  </label>
                  <select
                    value={formData.student_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select a student (optional)</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id.toString()}>
                        {student.first_name} {student.last_name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scheduling */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule for Later (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to start immediately
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_ai_generated"
                    checked={formData.is_ai_generated}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_ai_generated: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="is_ai_generated" className="ml-2 text-sm text-gray-700">
                    Use AI-generated questions (recommended)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="security_enabled"
                    checked={formData.security_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, security_enabled: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="security_enabled" className="ml-2 text-sm text-gray-700">
                    Enable security monitoring (prevents tab switching)
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/interviews')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={loading}
                >
                  {user?.role === 'student' ? 'Start Professional Interview' : 'Create Professional Interview'}
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <Card.Content className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">AI-Generated Questions</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Our AI creates personalized questions based on your category and difficulty preferences.
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Instant Feedback</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Get detailed AI-powered feedback on your answers immediately after completion.
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default NewInterviewPage;

export async function getServerSideProps() {
  return {
    props: {}
  };
}
