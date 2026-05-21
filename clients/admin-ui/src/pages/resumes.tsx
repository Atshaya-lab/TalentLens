import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { Resume } from '../../shared/types';
import { formatDate, formatFileSize } from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Loading from '../components/ui/Loading';
import Card from '../components/ui/Card';
import { useToast } from '../hooks';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
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
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !title.trim()) {
      showToast('Please select a file and enter a title', 'error');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Resume" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resume File *
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            required
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {file.name} ({formatFileSize(file.size)})
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., Software Engineer Resume"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Add any notes about this resume..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
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
            isLoading={uploading}
            disabled={!file || !title.trim()}
          >
            Upload Resume
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ResumesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    fetchResumes();
  }, [isAuthenticated, router]);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getResumes();
      setResumes(response.data);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      showToast('Failed to load resumes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (resumeId: number) => {
    setAnalyzing(resumeId);
    
    try {
      const response = await apiService.analyzeResume(resumeId);
      showToast('Resume analysis completed!', 'success');
      
      // Update the resume with analysis results
      setResumes(prevResumes => 
        prevResumes.map(resume => 
          resume.id === resumeId 
            ? { ...resume, analysis_result: response.data.analysis, extracted_skills: response.data.skills }
            : resume
        )
      );
    } catch (error: any) {
      console.error('Analysis error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to analyze resume';
      showToast(errorMessage, 'error');
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDelete = async (resumeId: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    try {
      await apiService.deleteResume(resumeId);
      setResumes(prevResumes => prevResumes.filter(resume => resume.id !== resumeId));
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
            <h1 className="text-3xl font-bold text-gray-900">My Resumes</h1>
            <p className="mt-2 text-gray-600">
              Upload and manage your resumes for AI-powered analysis
            </p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)}>
            Upload Resume
          </Button>
        </div>

        {/* Resumes Grid */}
        {resumes.length === 0 ? (
          <Card className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes uploaded</h3>
            <p className="text-gray-500 mb-4">
              Upload your first resume to get started with AI-powered analysis
            </p>
            <Button onClick={() => setUploadModalOpen(true)}>
              Upload Your First Resume
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map(resume => (
              <Card key={resume.id} className="hover:shadow-lg transition-shadow">
                <Card.Header>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {resume.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded {formatDate(resume.created_at)}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleAnalyze(resume.id)}
                        disabled={analyzing === resume.id}
                        className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        title="Analyze Resume"
                      >
                        {analyzing === resume.id ? (
                          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(resume.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Resume"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Card.Header>

                <Card.Content className="space-y-3">
                  {resume.description && (
                    <p className="text-sm text-gray-600">{resume.description}</p>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {resume.file_size ? formatFileSize(resume.file_size) : 'N/A'}
                  </div>

                  {resume.extracted_skills && resume.extracted_skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Skills:</h4>
                      <div className="flex flex-wrap gap-1">
                        {resume.extracted_skills.slice(0, 5).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
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

                  {resume.analysis_result && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-green-800 mb-1">AI Analysis Complete</h4>
                      <p className="text-xs text-green-700">
                        {resume.analysis_result.length > 100 
                          ? `${resume.analysis_result.substring(0, 100)}...`
                          : resume.analysis_result
                        }
                      </p>
                    </div>
                  )}
                </Card.Content>

                <Card.Footer>
                  <div className="flex justify-between">
                    <a
                      href={resume.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                    >
                      View File
                    </a>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      resume.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {resume.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </Card.Footer>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <ResumeUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={fetchResumes}
      />
    </Layout>
  );
};

export default ResumesPage;
