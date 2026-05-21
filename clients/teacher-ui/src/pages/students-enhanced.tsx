import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { User, Resume, InterviewSession } from '../types';
import { formatDate, formatFileSize } from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Loading from '../components/ui/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useToast } from '../hooks';

interface StudentWithProgress extends User {
  resume?: Resume;
  hasResume: boolean;
  resumeProgress: 'none' | 'uploaded' | 'analyzed';
  interviewsCompleted: number;
  totalInterviews: number;
  averageScore: number;
  lastActivity: string;
  progressPercentage: number;
}

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentWithProgress | null;
  onSuccess: () => void;
}

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentWithProgress | null;
  onSuccess: () => void;
}

interface ResumeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: Resume | null;
  student: StudentWithProgress | null;
}

const StudentModal: React.FC<StudentModalProps> = ({ isOpen, onClose, student, onSuccess }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (student) {
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        phone_number: student.phone_number || '',
        is_active: student.is_active,
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        is_active: true,
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (student) {
        await apiService.updateUser(student.id, formData);
        showToast('Student updated successfully', 'success');
      } else {
        const newStudentData = {
          ...formData,
          password: 'TempPass123!',
        };
        await apiService.createStudent(newStudentData);
        showToast('Student created successfully', 'success');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Submit error:', error);
      const errorData = error.response?.data;
      
      // Handle student limit error specifically
      if (errorData?.error === 'Student limit reached') {
        showToast(errorData.message, 'error');
        if (!errorData.has_premium) {
          showToast('Upgrade to Premium for unlimited students', 'info');
        }
      } else {
        const errorMessage = errorData?.message || `Failed to ${student ? 'update' : 'create'} student`;
        showToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={student ? 'Edit Student' : 'Add New Student'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
            Active Account
          </label>
        </div>

        {!student && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm text-emerald-800">
              <strong>Note:</strong> Temporary password "TempPass123!" will be assigned. Student should change it on first login.
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {student ? 'Update Student' : 'Create Student'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({ isOpen, onClose, student, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (student && isOpen) {
      setTitle(`${student.first_name} ${student.last_name} - Resume`);
      setDescription('');
      setFile(null);
    }
  }, [student, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf' && selectedFile.type !== 'application/msword' && 
          selectedFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        showToast('Please select a PDF or Word document', 'error');
        return;
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('File size must be less than 5MB', 'error');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !student || !title.trim()) {
      showToast('Please select a file and enter a title', 'error');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('resume_file', file);
      formData.append('student_id', student.id.toString());
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      await apiService.uploadResume(formData);
      showToast('Resume uploaded successfully!', 'success');
      onSuccess();
      onClose();
      
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload resume';
      showToast(errorMessage, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Upload Resume for ${student?.first_name} ${student?.last_name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm text-emerald-800">
            <span className="font-medium">Student:</span> {student?.first_name} {student?.last_name} ({student?.email})
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Resume File *
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            required
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({formatFileSize(file.size)})
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Resume Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., John Doe - Software Engineer Resume"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional notes about this resume..."
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={uploading}
            disabled={!file || !title.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {uploading ? 'Uploading...' : 'Upload Resume'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ResumeViewModal: React.FC<ResumeViewModalProps> = ({ isOpen, onClose, resume, student }) => {
  const { showToast } = useToast();

  const handleDownload = () => {
    if (resume?.file_url) {
      window.open(resume.file_url, '_blank');
    } else {
      showToast('Resume file not available for download', 'error');
    }
  };

  if (!resume || !student) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resume Details" size="lg">
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-emerald-800">{resume.title}</h3>
              <p className="text-sm text-emerald-600">
                Student: {student.first_name} {student.last_name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-emerald-600">
                Uploaded: {formatDate(resume.upload_date || resume.created_at)}
              </p>
              {resume.file_size && (
                <p className="text-sm text-emerald-600">
                  Size: {formatFileSize(resume.file_size)}
                </p>
              )}
            </div>
          </div>
        </div>

        {resume.description && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              {resume.description}
            </p>
          </div>
        )}

        {resume.extracted_skills && resume.extracted_skills.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Skills</h4>
            <div className="flex flex-wrap gap-2">
              {resume.extracted_skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {resume.analysis_result && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis Summary</h4>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {resume.analysis_result}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Download Resume
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ProgressBar: React.FC<{ percentage: number; color?: string }> = ({ 
  percentage, 
  color = 'bg-emerald-500' 
}) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className={`h-2 rounded-full transition-all duration-300 ${color}`}
      style={{ width: `${Math.min(percentage, 100)}%` }}
    />
  </div>
);

const StudentsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithProgress | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resumeUploadModalOpen, setResumeUploadModalOpen] = useState(false);
  const [resumeViewModalOpen, setResumeViewModalOpen] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [resumeFilter, setResumeFilter] = useState<'all' | 'with_resume' | 'without_resume'>('all');
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user?.role !== 'administrator' && user?.role !== 'teacher') {
      router.push('/dashboard');
      return;
    }
    
    fetchStudentsWithProgress();
  }, [isAuthenticated, user?.role, router]);

  const fetchStudentsWithProgress = async () => {
    try {
      setLoading(true);
      
      // Fetch students and resumes in parallel
      const [studentsResponse, resumesResponse] = await Promise.all([
        apiService.getUsers({ role: 'student' }),
        apiService.getResumes()
      ]);

      const studentsData = studentsResponse.data.results;
      const resumesData = resumesResponse.data;
      setResumes(resumesData);

      // Enhance students with resume and progress information
      const enhancedStudents: StudentWithProgress[] = studentsData.map(student => {
        const studentResume = resumesData.find(resume => resume.student === student.id);
        
        // Calculate progress metrics (mock data for now - would come from actual interview data)
        const interviewsCompleted = Math.floor(Math.random() * 10);
        const totalInterviews = interviewsCompleted + Math.floor(Math.random() * 5);
        const averageScore = totalInterviews > 0 ? Math.floor(Math.random() * 40) + 60 : 0;
        const progressPercentage = totalInterviews > 0 ? (interviewsCompleted / totalInterviews) * 100 : 0;

        return {
          ...student,
          resume: studentResume,
          hasResume: !!studentResume,
          resumeProgress: studentResume 
            ? (studentResume.analysis_result ? 'analyzed' : 'uploaded')
            : 'none',
          interviewsCompleted,
          totalInterviews,
          averageScore,
          lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          progressPercentage,
        };
      });

      setStudents(enhancedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: StudentWithProgress) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleDelete = async (studentId: number) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteUser(studentId);
      setStudents(prev => prev.filter(student => student.id !== studentId));
      showToast('Student deleted successfully', 'success');
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete student';
      showToast(errorMessage, 'error');
    }
  };

  const handleToggleStatus = async (student: StudentWithProgress) => {
    try {
      const updatedStudent = await apiService.updateUser(student.id, {
        is_active: !student.is_active
      });
      
      setStudents(prev => 
        prev.map(s => s.id === student.id ? { ...s, is_active: updatedStudent.data.is_active } : s)
      );
      
      showToast(
        `Student ${updatedStudent.data.is_active ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
    } catch (error: any) {
      console.error('Status toggle error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update student status';
      showToast(errorMessage, 'error');
    }
  };

  const handleUploadResume = (student: StudentWithProgress) => {
    setSelectedStudent(student);
    setResumeUploadModalOpen(true);
  };

  const handleViewResume = (student: StudentWithProgress) => {
    if (student.resume) {
      setSelectedStudent(student);
      setSelectedResume(student.resume);
      setResumeViewModalOpen(true);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && student.is_active) ||
      (statusFilter === 'inactive' && !student.is_active);

    const matchesResume = 
      resumeFilter === 'all' ||
      (resumeFilter === 'with_resume' && student.hasResume) ||
      (resumeFilter === 'without_resume' && !student.hasResume);

    return matchesSearch && matchesStatus && matchesResume;
  });

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getResumeStatusBadge = (student: StudentWithProgress) => {
    if (!student.hasResume) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          No Resume
        </span>
      );
    }
    
    const badgeClass = student.resumeProgress === 'analyzed' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
        {student.resumeProgress === 'analyzed' ? 'Analyzed' : 'Uploaded'}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Students</h1>
            <p className="mt-2 text-gray-600">
              Comprehensive student management with progress tracking and resume management
            </p>
          </div>
          <Button 
            onClick={() => {
              setSelectedStudent(null);
              setModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Add New Student
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search students by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Students</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <select
                  value={resumeFilter}
                  onChange={(e) => setResumeFilter(e.target.value as 'all' | 'with_resume' | 'without_resume')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Resumes</option>
                  <option value="with_resume">With Resume</option>
                  <option value="without_resume">Without Resume</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <Card className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' || resumeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Start by adding your first student'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && resumeFilter === 'all' && (
              <Button 
                onClick={() => {
                  setSelectedStudent(null);
                  setModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Add First Student
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Student Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-emerald-600 font-medium text-lg">
                            {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {student.first_name} {student.last_name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {getResumeStatusBadge(student)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p className="flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                              </svg>
                              {student.email}
                            </p>
                            <p className="flex items-center mt-1">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 0v10m-6-6h12" />
                              </svg>
                              Joined {formatDate(student.date_joined)}
                            </p>
                          </div>
                          <div>
                            <p className="flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              {student.interviewsCompleted}/{student.totalInterviews} interviews
                            </p>
                            <p className="flex items-center mt-1">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Last active {formatDate(student.lastActivity)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Section */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Progress ({student.progressPercentage.toFixed(0)}%)
                            </span>
                            <span className="text-sm text-gray-500">
                              Avg Score: {student.averageScore}%
                            </span>
                          </div>
                          <ProgressBar 
                            percentage={student.progressPercentage} 
                            color={getProgressColor(student.progressPercentage)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {/* Resume Actions */}
                      <div className="flex space-x-2">
                        {student.hasResume ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewResume(student)}
                              className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                            >
                              View Resume
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUploadResume(student)}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              Replace
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUploadResume(student)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Upload Resume
                          </Button>
                        )}
                      </div>

                      {/* Student Actions */}
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(student)}
                        >
                          {student.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(student)}
                        >
                          Edit
                        </Button>
                        
                        {user?.role === 'administrator' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(student.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Total Students</p>
                  <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Active Students</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {students.filter(s => s.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">With Resumes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {students.filter(s => s.hasResume).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Avg Progress</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {students.length > 0 
                      ? Math.round(students.reduce((acc, s) => acc + s.progressPercentage, 0) / students.length)
                      : 0
                    }%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <StudentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSuccess={fetchStudentsWithProgress}
      />

      <ResumeUploadModal
        isOpen={resumeUploadModalOpen}
        onClose={() => {
          setResumeUploadModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSuccess={fetchStudentsWithProgress}
      />

      <ResumeViewModal
        isOpen={resumeViewModalOpen}
        onClose={() => {
          setResumeViewModalOpen(false);
          setSelectedStudent(null);
          setSelectedResume(null);
        }}
        resume={selectedResume}
        student={selectedStudent}
      />
    </Layout>
  );
};

export default StudentsPage;
