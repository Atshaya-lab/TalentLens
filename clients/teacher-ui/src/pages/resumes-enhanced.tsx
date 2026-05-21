import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { Resume, User } from '../types';
import { formatDate, formatFileSize } from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Loading from '../components/ui/Loading';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { useToast } from '../hooks';

interface StudentResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  students: User[];
}

const StudentResumeUploadModal: React.FC<StudentResumeUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  students 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

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
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !selectedStudentId || !title.trim()) {
      showToast('Please select a student, file, and enter a title', 'error');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('resume_file', file);
      formData.append('student_id', selectedStudentId.toString());
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
      setSelectedStudentId(null);
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

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Student Resume" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Selection */}
        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Select Student *
          </label>
          <select
            value={selectedStudentId || ''}
            onChange={(e) => setSelectedStudentId(Number(e.target.value) || null)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            required
          >
            <option value="">Choose a student...</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name} ({student.email})
              </option>
            ))}
          </select>
          {selectedStudent && (
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
              <p className="text-sm text-emerald-800">
                <span className="font-medium">Selected:</span> {selectedStudent.first_name} {selectedStudent.last_name}
              </p>
              <p className="text-sm text-emerald-600">{selectedStudent.email}</p>
            </div>
          )}
        </div>

        {/* File Upload */}
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

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-emerald-700 mb-2">
            Resume Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Software Engineer Resume"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
        </div>

        {/* Description */}
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

        {/* Actions */}
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
            disabled={!file || !selectedStudentId || !title.trim()}
          >
            {uploading ? 'Uploading...' : 'Upload Resume'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const StudentResumeManagementPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user?.role !== 'teacher' && user?.role !== 'administrator') {
      router.push('/dashboard');
      return;
    }
    
    fetchData();
  }, [isAuthenticated, user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resumesResponse, studentsResponse] = await Promise.all([
        apiService.getResumes(),
        apiService.getUsers({ role: 'student' })
      ]);
      
      setResumes(resumesResponse.data);
      const studentsData = Array.isArray(studentsResponse.data)
        ? studentsResponse.data
        : studentsResponse.data.results;
      setStudents(studentsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    fetchData();
    setShowUploadModal(false);
  };

  const handleDeleteResume = async (resumeId: number) => {
    if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteResume(resumeId);
      setResumes(prev => prev.filter(resume => resume.id !== resumeId));
      showToast('Resume deleted successfully', 'success');
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete resume';
      showToast(errorMessage, 'error');
    }
  };

  const getStudentName = (userId: number) => {
    const student = students.find(s => s.id === userId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
  };

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Loading student resumes..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Resume Management</h1>
            <p className="text-gray-600">
              Upload and manage resumes for your students
            </p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => setShowUploadModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Upload Student Resume
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Uploaded Resumes</p>
                  <p className="text-2xl font-bold text-gray-900">{resumes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Coverage</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {students.length > 0 ? Math.round((resumes.length / students.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumes List */}
        <div className="space-y-4">
          {resumes.length > 0 ? (
            resumes.map((resume) => (
              <Card key={resume.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{resume.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          resume.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {resume.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">Student:</span> {getStudentName(resume.student)}
                      </p>
                      
                      {resume.description && (
                        <p className="text-sm text-gray-600 mb-3">{resume.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Uploaded: {formatDate(resume.created_at)}</span>
                        {resume.file_size && (
                          <span>Size: {formatFileSize(resume.file_size)}</span>
                        )}
                        {resume.experience_years && (
                          <span>Experience: {resume.experience_years} years</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {resume.file_url && (
                        <a
                          href={resume.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-sm text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          Download
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedResume(resume)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteResume(resume.id)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {/* Skills Preview */}
                  {resume.extracted_skills && resume.extracted_skills.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Extracted Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {resume.extracted_skills.slice(0, 5).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {resume.extracted_skills.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{resume.extracted_skills.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Resumes Uploaded</h3>
                <p className="text-gray-600 mb-4">
                  Start by uploading resumes for your students to help them practice interviews.
                </p>
                <Button 
                  variant="primary" 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Upload First Resume
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upload Modal */}
        <StudentResumeUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
          students={students}
        />

        {/* Resume Details Modal */}
        {selectedResume && (
          <Modal 
            isOpen={!!selectedResume} 
            onClose={() => setSelectedResume(null)} 
            title="Resume Details" 
            size="lg"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{selectedResume.title}</h3>
                <p className="text-sm text-gray-600">
                  Student: {getStudentName(selectedResume.student)}
                </p>
              </div>
              
              {selectedResume.extracted_skills && selectedResume.extracted_skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.extracted_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedResume.analysis_result && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedResume.analysis_result}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedResume.content && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Content Preview:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {selectedResume.content.substring(0, 1000)}
                      {selectedResume.content.length > 1000 && '...'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default StudentResumeManagementPage;
