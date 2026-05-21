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
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Student *
          </label>
          <select
            value={selectedStudentId || ''}
            onChange={(e) => setSelectedStudentId(Number(e.target.value) || null)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white hover:border-gray-400"
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
            <div className="mt-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {selectedStudent.first_name[0]}{selectedStudent.last_name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-sm text-emerald-600">{selectedStudent.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Resume File *
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-emerald-500 file:to-teal-500 file:text-white hover:file:from-emerald-600 hover:file:to-teal-600 file:transition-all file:duration-200 file:cursor-pointer"
              required
            />
          </div>
          {file && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-blue-800">{file.name}</span>
                <span className="text-sm text-blue-600">({formatFileSize(file.size)})</span>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Resume Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Software Engineer Resume"
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white hover:border-gray-400"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional notes about this resume..."
            rows={3}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white hover:border-gray-400 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploading}
            className="px-6 py-3"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            isLoading={uploading}
            disabled={!file || !selectedStudentId || !title.trim()}
            className="px-6 py-3"
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
      router.push('/signin');
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
      
      // Handle both array response and paginated response for resumes
      const resumesData = Array.isArray(resumesResponse.data) 
        ? resumesResponse.data 
        : (resumesResponse.data as any)?.results || [];
      setResumes(resumesData);
      
      // Handle both array response and paginated response for students
      const studentsData = Array.isArray(studentsResponse.data) 
        ? studentsResponse.data 
        : (studentsResponse.data as any)?.results || [];
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

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Loading student resumes..." />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    Resume Management
                  </h1>
                  <p className="text-emerald-100 text-lg">
                    Upload and manage resumes for your students to enhance their interview preparation
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              variant="gradient"
              onClick={() => setShowUploadModal(true)}
              className="bg-white text-emerald-600 hover:bg-white/90 font-semibold shadow-lg transition-all duration-200 hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Upload Resume
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Uploaded Resumes</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {resumes.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Coverage</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {students.length > 0 ? Math.round((resumes.length / students.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumes List */}
        <div className="space-y-6">
          {resumes.length > 0 ? (
            resumes.map((resume, index) => (
              <Card 
                key={resume.id} 
                variant="elevated"
                className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-emerald-500 relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                
                <CardContent className="p-6 relative z-10">
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-200">
                            {resume.title}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              resume.is_active 
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                                : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200'
                            }`}>
                              {resume.is_active ? '✅ Active' : '⏸️ Inactive'}
                            </span>
                            <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                              📄 Resume
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Student Info */}
                      <div className="flex items-center space-x-3 mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-sm">
                            {resume.student_name ? resume.student_name.split(' ').map(n => n[0]).join('') : 'U'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-lg font-bold text-gray-900">
                            {resume.student_name || 'Unknown Student'}
                          </p>
                          <p className="text-sm text-emerald-600 font-medium">
                            Student • Resume Owner
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-xs text-gray-500 mt-1">Online</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {resume.description && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed italic">
                        "{resume.description}"
                      </p>
                    </div>
                  )}

                  {/* Key Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Upload Date</p>
                        <p className="text-sm font-bold text-gray-900">{formatDate(resume.upload_date)}</p>
                      </div>
                    </div>

                    {resume.file_size && (
                      <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-purple-600 font-medium">File Size</p>
                          <p className="text-sm font-bold text-gray-900">{formatFileSize(resume.file_size)}</p>
                        </div>
                      </div>
                    )}

                    {resume.experience_years && (
                      <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-yellow-600 font-medium">Experience</p>
                          <p className="text-sm font-bold text-gray-900">{resume.experience_years} years</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Skills Section */}
                  {resume.extracted_skills && resume.extracted_skills.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h4 className="text-sm font-bold text-gray-700">Key Skills ({resume.extracted_skills.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {resume.extracted_skills.slice(0, 8).map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200 hover:scale-105 transition-transform duration-200 cursor-pointer group/skill"
                          >
                            <span className="group-hover/skill:text-blue-900 transition-colors duration-200">{skill}</span>
                          </span>
                        ))}
                        {resume.extracted_skills.length > 8 && (
                          <span className="px-3 py-2 bg-gradient-to-r from-gray-100 to-slate-100 text-gray-600 text-xs font-semibold rounded-full border border-gray-200 hover:scale-105 transition-transform duration-200 cursor-pointer">
                            +{resume.extracted_skills.length - 8} more skills
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                      {resume.file_url && (
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => window.open(resume.file_url, '_blank')}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                          </svg>
                          Download PDF
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedResume(resume)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:scale-105 transition-all duration-200 shadow-md"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-600 hover:bg-purple-50 hover:scale-105 transition-all duration-200 shadow-md"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Create Interview
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600 border-gray-600 hover:bg-gray-50 hover:scale-105 transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteResume(resume.id)}
                        className="text-red-600 border-red-600 hover:bg-red-50 hover:scale-105 transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card variant="elevated" className="text-center py-16">
              <CardContent>
                <div className="mx-auto w-24 h-24 bg-gradient-to-r from-gray-100 to-slate-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Resumes Uploaded</h3>
                <p className="text-gray-600 mb-6 text-lg">
                  Start by uploading resumes for your students to help them practice interviews.
                </p>
                <Button 
                  variant="gradient"
                  onClick={() => setShowUploadModal(true)}
                  className="px-8 py-3 text-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
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
            size="xl"
          >
            <div className="space-y-8">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{selectedResume.title}</h3>
                        <p className="text-lg font-semibold text-emerald-700">
                          {selectedResume.student_name || 'Unknown Student'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Uploaded: {formatDate(selectedResume.upload_date)}</span>
                      </div>
                      {selectedResume.file_size && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                          </svg>
                          <span>Size: {formatFileSize(selectedResume.file_size)}</span>
                        </div>
                      )}
                      {selectedResume.experience_years && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                          </svg>
                          <span>Experience: {selectedResume.experience_years} years</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {selectedResume.file_url && (
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={() => window.open(selectedResume.file_url, '_blank')}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-purple-600 border-purple-600 hover:bg-purple-50"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Create Interview
                    </Button>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedResume.description && (
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-2xl border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Description
                  </h4>
                  <p className="text-gray-700 leading-relaxed italic text-lg">
                    "{selectedResume.description}"
                  </p>
                </div>
              )}
              
              {/* Skills Section */}
              {selectedResume.extracted_skills && selectedResume.extracted_skills.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Extracted Skills ({selectedResume.extracted_skills.length})
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedResume.extracted_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-semibold rounded-full border border-blue-200 hover:scale-105 transition-transform duration-200 cursor-pointer"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Analysis Section */}
              {selectedResume.analysis_result && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    AI Analysis
                  </h4>
                  <div className="bg-white p-4 rounded-xl border border-green-200">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedResume.analysis_result}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Content Preview */}
              {selectedResume.content && (
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-2xl border border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                    </svg>
                    Content Preview
                  </h4>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {selectedResume.content.substring(0, 2000)}
                      {selectedResume.content.length > 2000 && (
                        <span className="text-blue-600 font-semibold">... (truncated)</span>
                      )}
                    </pre>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Actions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="text-purple-600 border-purple-600 hover:bg-purple-50 h-12"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Create Interview
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50 h-12"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Resume
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50 h-12"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark as Reviewed
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default StudentResumeManagementPage;

// Prevent static generation for this page since it requires authentication
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
