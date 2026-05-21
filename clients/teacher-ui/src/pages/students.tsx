import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: Resume | null;
  student: StudentWithProgress | null;
}

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentWithProgress | null;
  onSuccess: () => void;
}

interface StudentAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({});
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
    
    // Reset password fields
    setPasswordData({
      new_password: '',
      confirm_password: '',
    });
    setShowPasswordSection(false);
    setPasswordErrors({});
  }, [student]);

  const validatePassword = () => {
    const errors: {[key: string]: string} = {};
    
    if (!passwordData.new_password) {
      errors.new_password = 'Password is required';
    } else if (passwordData.new_password.length < 6) {
      errors.new_password = 'Password must be at least 6 characters long';
    }
    
    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Password confirmation is required';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (student) {
        // Update basic student info
        await apiService.updateUser(student.id, formData);
        
        // Handle password change if requested
        if (showPasswordSection) {
          if (!validatePassword()) {
            setLoading(false);
            return;
          }
          
          try {
            await apiService.changeStudentPassword(student.id, passwordData.new_password);
            showToast('Student and password updated successfully', 'success');
          } catch (passwordError: any) {
            const errorMessage = passwordError.response?.data?.error || 'Failed to change password';
            showToast(`Student updated, but password change failed: ${errorMessage}`, 'warning');
          }
        } else {
          showToast('Student updated successfully', 'success');
        }
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

        {/* Password Change Section for Existing Students */}
        {student && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                {showPasswordSection ? 'Cancel' : 'Change Password'}
              </Button>
            </div>
            
            {showPasswordSection && (
              <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, new_password: e.target.value }));
                      setPasswordErrors(prev => ({ ...prev, new_password: '' }));
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      passwordErrors.new_password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter new password"
                  />
                  {passwordErrors.new_password && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.new_password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }));
                      setPasswordErrors(prev => ({ ...prev, confirm_password: '' }));
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      passwordErrors.confirm_password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Confirm new password"
                  />
                  {passwordErrors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirm_password}</p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Password Requirements:</strong> At least 6 characters long
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

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

const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({ isOpen, onClose, resume, student }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && resume) {
      fetchResumeContent();
    }
  }, [isOpen, resume]);

  const fetchResumeContent = async () => {
    if (!resume) return;
    
    setLoading(true);
    try {
      const response = await apiService.getResumePreview(resume.id);
      setContent(response.data.content);
    } catch (error: any) {
      console.error('Error fetching resume content:', error);
      showToast('Failed to load resume content', 'error');
      setContent('Failed to load resume content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!resume || !student) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resume Preview" size="xl">
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
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Resume Content</h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {content}
              </pre>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
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

const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({ 
  isOpen, 
  onClose, 
  student, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    scheduled_datetime: '',
    interview_type: 'technical' as 'technical' | 'communication' | 'aptitude',
    duration_minutes: 60,
    instructions: '',
    target_type: 'single' as 'single' | 'all',
    selected_students: [] as number[],
    is_secure_mode: true
  });
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      setFormData({
        scheduled_datetime: tomorrow.toISOString().slice(0, 16),
        interview_type: 'technical',
        duration_minutes: 60,
        instructions: '',
        target_type: student ? 'single' : 'all',
        selected_students: student ? [student.id] : [],
        is_secure_mode: true
      });

      // Fetch all students for multi-select option
      if (!student) {
        fetchAllStudents();
      }
    }
  }, [isOpen, student]);

  const fetchAllStudents = async () => {
    try {
      const response = await apiService.getUsers({ role: 'student' });
      const studentsData = response.data.results || [];
      setAllStudents(studentsData);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const scheduledDate = new Date(formData.scheduled_datetime);
      const endDate = new Date(scheduledDate.getTime() + formData.duration_minutes * 60000);

      // Generate secure session ID
      const sessionId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let targetStudents: number[] = [];
      
      if (formData.target_type === 'single') {
        targetStudents = student ? [student.id] : formData.selected_students;
      } else {
        // Get all active students
        targetStudents = allStudents.filter(s => s.is_active).map(s => s.id);
      }

      if (targetStudents.length === 0) {
        showToast('Please select at least one student', 'error');
        return;
      }

      // Create interviews for all selected students
      const interviewPromises = targetStudents.map(studentId => {
        const interviewData = {
          student: studentId,
          scheduled_datetime: scheduledDate.toISOString(),
          end_datetime: endDate.toISOString(),
          interview_type: formData.interview_type,
          duration_minutes: formData.duration_minutes,
          instructions: formData.instructions,
          is_secure_mode: formData.is_secure_mode,
          session_id: `${sessionId}_${studentId}`,
          // Security metadata
          security_config: {
            tab_switch_limit: 3,
            warning_limit: 5,
            time_extension_allowed: false,
            copy_paste_disabled: formData.is_secure_mode,
            screen_recording_detection: formData.is_secure_mode
          }
        };
        return apiService.createInterview(interviewData);
      });

      await Promise.all(interviewPromises);
      
      const message = targetStudents.length === 1 
        ? 'Interview scheduled successfully!'
        : `${targetStudents.length} interviews scheduled successfully!`;
      
      showToast(message, 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Schedule interview error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to schedule interview(s)';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={student ? `Schedule Interview - ${student.first_name} ${student.last_name}` : 'Schedule Interview'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target Selection */}
        {!student && (
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-3">
              Interview Target *
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={formData.target_type === 'all'}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value as 'single' | 'all' }))}
                  className="mr-2"
                />
                <span>All Active Students ({allStudents.filter(s => s.is_active).length} students)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="single"
                  checked={formData.target_type === 'single'}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value as 'single' | 'all' }))}
                  className="mr-2"
                />
                <span>Specific Students</span>
              </label>
            </div>

            {formData.target_type === 'single' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Students *
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {allStudents.map(s => (
                    <label key={s.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        checked={formData.selected_students.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              selected_students: [...prev.selected_students, s.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              selected_students: prev.selected_students.filter(id => id !== s.id)
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{s.first_name} {s.last_name} ({s.email})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              Interview Type *
            </label>
            <select
              value={formData.interview_type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                interview_type: e.target.value as 'technical' | 'communication' | 'aptitude'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            >
              <option value="technical">Technical Interview</option>
              <option value="communication">Communication Interview</option>
              <option value="aptitude">Aptitude Interview</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              Duration (minutes) *
            </label>
            <select
              value={formData.duration_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>
        </div>

        {/* Scheduled Date & Time */}
        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Scheduled Date & Time *
          </label>
          <input
            type="datetime-local"
            value={formData.scheduled_datetime}
            onChange={(e) => setFormData(prev => ({ ...prev, scheduled_datetime: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            required
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        {/* Security Settings */}
        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-3">
            Security Settings
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_secure_mode}
                onChange={(e) => setFormData(prev => ({ ...prev, is_secure_mode: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">Enable Secure Mode (Recommended)</span>
            </label>
            {formData.is_secure_mode && (
              <div className="ml-6 text-xs text-gray-600 space-y-1">
                <p>• Tab switching monitoring (3 warnings limit)</p>
                <p>• Copy/paste disabled</p>
                <p>• Screen recording detection</p>
                <p>• Time extension not allowed</p>
                <p>• Automatic session invalidation on violations</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Instructions (Optional)
          </label>
          <textarea
            value={formData.instructions}
            onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            rows={3}
            placeholder="Enter any special instructions for the interview..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
            disabled={loading}
          >
            {loading ? 'Scheduling...' : `Schedule Interview${formData.target_type === 'all' || formData.selected_students.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const StudentAnalyticsModal: React.FC<StudentAnalyticsModalProps> = ({ 
  isOpen, 
  onClose, 
  student 
}) => {
  const { isDark } = useTheme();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && student) {
      fetchStudentAnalytics();
    }
  }, [isOpen, student]);

  const fetchStudentAnalytics = async () => {
    if (!student) return;

    setLoading(true);
    try {
      const response = await apiService.getStudentAnalytics(student.id);
      setAnalyticsData(response.data);
    } catch (error: any) {
      console.error('Fetch analytics error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch analytics';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Analytics - ${student?.first_name} ${student?.last_name}`}
      size="lg"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        ) : analyticsData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-1">Total Interviews</h3>
                <p className="text-2xl font-bold text-blue-900">{analyticsData.total_interviews || 0}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-800 mb-1">Average Score</h3>
                <p className="text-2xl font-bold text-green-900">{analyticsData.average_score || 0}%</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-800 mb-1">Progress Trend</h3>
                <p className="text-2xl font-bold text-purple-900 capitalize">
                  {analyticsData.trend || 'Stable'}
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">Recent Average</h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {analyticsData.performance_summary?.recent_average || 0}%
                </p>
              </div>
            </div>

            {/* Performance Improvement */}
            {analyticsData.performance_summary && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Performance Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Overall Average</p>
                    <p className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{analyticsData.performance_summary.overall_average}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recent Performance</p>
                    <p className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{analyticsData.performance_summary.recent_average}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Improvement</p>
                    <p className={`text-lg font-bold ${
                      analyticsData.performance_summary.improvement > 0 ? 'text-green-600' :
                      analyticsData.performance_summary.improvement < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {analyticsData.performance_summary.improvement > 0 ? '+' : ''}{analyticsData.performance_summary.improvement}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Skills Breakdown */}
            {analyticsData.skills && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Skills Performance</h3>
                <div className="space-y-3">
                  {Object.entries(analyticsData.skills).map(([skill, score]: [string, any]) => (
                    <div key={skill} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {skill.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold min-w-[3rem] text-right ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {score}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Interview History */}
            {analyticsData.recent_interviews && analyticsData.recent_interviews.length > 0 ? (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Recent Interviews</h3>
                <div className="space-y-3">
                  {analyticsData.recent_interviews.map((interview: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          interview.score >= 80 ? 'bg-green-500' :
                          interview.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {interview.interview_type.replace('_', ' ')} Interview
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(interview.date)} • {interview.duration} minutes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          interview.score >= 80 ? 'text-green-600' :
                          interview.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {interview.score}%
                        </p>
                        <p className="text-xs text-gray-400">
                          {interview.score >= 80 ? 'Excellent' :
                           interview.score >= 60 ? 'Good' : 'Needs Improvement'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No interview history available</p>
                <p className="text-sm text-gray-400 mt-1">Student hasn't completed any interviews yet</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No analytics data available for this student.</p>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const StudentsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithProgress | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resumeUploadModalOpen, setResumeUploadModalOpen] = useState(false);
  const [resumeViewModalOpen, setResumeViewModalOpen] = useState(false);
  const [resumePreviewModalOpen, setResumePreviewModalOpen] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [resumeFilter, setResumeFilter] = useState<'all' | 'with_resume' | 'without_resume'>('all');
  const [scheduleInterviewModalOpen, setScheduleInterviewModalOpen] = useState(false);
  const [studentAnalyticsModalOpen, setStudentAnalyticsModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
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
      
      // Use the new comprehensive endpoint for real student data
      const response = await apiService.getStudentsWithProgress();
      const studentsData = response.data.students;
      
      // Transform the data to match the existing interface
      const enhancedStudents: StudentWithProgress[] = studentsData.map(student => ({
        ...student,
        resume: student.resume ? {
          id: student.resume.id,
          title: student.resume.title,
          upload_date: student.resume.uploaded_date,
          analysis_result: student.resume.analyzed,
          student: student.id,
        } as Resume : undefined,
        hasResume: student.has_resume,
        resumeProgress: student.resume_status as 'none' | 'uploaded' | 'analyzed',
        interviewsCompleted: student.completed_interviews,
        totalInterviews: student.total_interviews,
        averageScore: student.average_score,
        lastActivity: student.last_activity,
        progressPercentage: student.progress_percentage,
        // Additional properties from User interface
        username: student.email, // Use email as username fallback
        password: '', // Not needed for display
        last_login: null,
        is_superuser: false,
        is_staff: false,
        date_joined: student.date_joined,
        role: 'student' as const,
        profile_picture: '',
        date_of_birth: null,
        address: '',
        created_at: student.date_joined,
        updated_at: student.date_joined,
      }));

      setStudents(enhancedStudents);
      
      // Update summary stats
      console.log(`Loaded ${response.data.total_count} students:`, {
        active: response.data.active_count,
        with_resume: response.data.with_resume_count
      });
      
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students with progress data', 'error');
      
      // Fallback to basic student data if the enhanced endpoint fails
      try {
        const [studentsResponse, resumesResponse] = await Promise.all([
          apiService.getUsers({ role: 'student' }),
          apiService.getResumes().catch(() => ({ data: [] }))
        ]);

        const studentsData = studentsResponse.data.results;
        const resumesData = Array.isArray(resumesResponse.data) 
          ? resumesResponse.data 
          : (resumesResponse.data as any)?.results || [];
        
        setResumes(resumesData);

        // Basic enhancement without progress data
        const enhancedStudents: StudentWithProgress[] = studentsData.map(student => {
          const studentResume = resumesData.find(resume => resume.student === student.id);
          
          return {
            ...student,
            resume: studentResume,
            hasResume: !!studentResume,
            resumeProgress: studentResume 
              ? (studentResume.analysis_result ? 'analyzed' : 'uploaded')
              : 'none',
            interviewsCompleted: 0,
            totalInterviews: 0,
            averageScore: 0,
            lastActivity: student.date_joined || new Date().toISOString(),
            progressPercentage: 0,
          };
        });

        setStudents(enhancedStudents);
        showToast('Loaded basic student data (progress data unavailable)', 'warning');
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
        showToast('Failed to load student data', 'error');
      }
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

  const handlePreviewResume = (student: StudentWithProgress) => {
    if (student.resume) {
      setSelectedStudent(student);
      setSelectedResume(student.resume);
      setResumePreviewModalOpen(true);
    }
  };

  const handleScheduleInterview = (student: StudentWithProgress) => {
    setSelectedStudent(student);
    setScheduleInterviewModalOpen(true);
  };

  const handleViewAnalytics = (student: StudentWithProgress) => {
    setSelectedStudent(student);
    setStudentAnalyticsModalOpen(true);
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Student Management
                  </h1>
                  <p className="text-emerald-100 text-lg">
                    Comprehensive student management with progress tracking and resume management
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedStudent(null);
                  setScheduleInterviewModalOpen(true);
                }}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule Interview(s)
              </Button>
              <Button 
                variant="gradient"
                onClick={() => {
                  setSelectedStudent(null);
                  setModalOpen(true);
                }}
                className="bg-white text-emerald-600 hover:bg-white/90 font-semibold shadow-lg transition-all duration-200 hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Student
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white hover:border-gray-400"
                  />
                </div>
              </div>
              
              <div className="flex space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white hover:border-gray-400"
                >
                  <option value="all">All Students</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <select
                  value={resumeFilter}
                  onChange={(e) => setResumeFilter(e.target.value as 'all' | 'with_resume' | 'without_resume')}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white hover:border-gray-400"
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
          <div className="space-y-6">
            {filteredStudents.map((student, index) => (
              <Card 
                key={student.id} 
                variant="elevated"
                className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-emerald-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Student Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <span className="text-white font-bold text-lg">
                            {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200">
                            {student.first_name} {student.last_name}
                          </h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            student.is_active 
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                              : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200'
                          }`}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {getResumeStatusBadge(student)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p className="flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 108 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
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
                      <div className="flex flex-wrap gap-2">
                        {student.hasResume ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewResume(student)}
                              className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                            >
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewResume(student)}
                              className="text-purple-600 border-purple-600 hover:bg-purple-50"
                            >
                              Preview Text
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
                        
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleScheduleInterview(student)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Schedule Interview
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAnalytics(student)}
                        >
                          View Analytics
                        </Button>
                        
                        {(user?.role === 'administrator' || user?.role === 'teacher') && (
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
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {students.length}
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
                  <p className="text-sm font-medium text-gray-600">Active Students</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {students.filter(s => s.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">With Resumes</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {students.filter(s => s.hasResume).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
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

      <ResumePreviewModal
        isOpen={resumePreviewModalOpen}
        onClose={() => {
          setResumePreviewModalOpen(false);
          setSelectedStudent(null);
          setSelectedResume(null);
        }}
        resume={selectedResume}
        student={selectedStudent}
      />

      <ScheduleInterviewModal
        isOpen={scheduleInterviewModalOpen}
        onClose={() => {
          setScheduleInterviewModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSuccess={fetchStudentsWithProgress}
      />

      <StudentAnalyticsModal
        isOpen={studentAnalyticsModalOpen}
        onClose={() => {
          setStudentAnalyticsModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
    </Layout>
  );
};

export default StudentsPage;
