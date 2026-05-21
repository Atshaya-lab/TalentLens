import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import { Resume } from '../types';
import { formatDate, formatFileSize } from '../utils/helpers';
import Loading from '../components/ui/Loading';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card';
import { useToast } from '../hooks';

const ResumesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    fetchResume();
  }, [isAuthenticated, router]);

  const fetchResume = async () => {
    try {
      setLoading(true);
      const response = await apiService.getResumes();
      // Students should only have one resume - take the first one
      setResume(response.data[0] || null);
    } catch (error: any) {
      console.error('Error fetching resume:', error);
      if (error.response?.status !== 404) {
        showToast('Failed to load resume', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading size="lg" text="Loading resume..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Resume</h1>
            <p className="text-gray-600">
              View your resume uploaded by your teacher
            </p>
          </div>
        </div>

        {/* Resume Content */}
        {resume ? (
          <div className="space-y-6">
            {/* Resume Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Resume Information</CardTitle>
                <CardDescription>
                  Last updated: {formatDate(resume.updated_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">File Details</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Title:</span> {resume.title}
                      </div>
                      {resume.description && (
                        <div>
                          <span className="font-medium">Description:</span> {resume.description}
                        </div>
                      )}
                      {resume.file_size && (
                        <div>
                          <span className="font-medium">Size:</span> {formatFileSize(resume.file_size)}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Upload Date:</span> {formatDate(resume.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis Stats</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Experience:</span> {resume.experience_years ? `${resume.experience_years} years` : 'Not specified'}
                      </div>
                      <div>
                        <span className="font-medium">Education Level:</span> {resume.education_level || 'Not specified'}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${resume.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {resume.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {resume.extracted_skills && resume.extracted_skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Skills</CardTitle>
                  <CardDescription>
                    Skills identified from your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {resume.extracted_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Result */}
            {resume.analysis_result && (
              <Card>
                <CardHeader>
                  <CardTitle>Resume Analysis</CardTitle>
                  <CardDescription>
                    AI-powered analysis of your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {resume.analysis_result}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resume Content Preview */}
            {resume.content && (
              <Card>
                <CardHeader>
                  <CardTitle>Resume Content</CardTitle>
                  <CardDescription>
                    Full text content of your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                      {resume.content}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Download Link */}
            {resume.file_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Download Resume</CardTitle>
                  <CardDescription>
                    Access your original resume file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href={resume.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v11a2 2 0 01-2 2z" />
                    </svg>
                    Download Resume
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* No Resume Message */
          <Card>
            <CardContent className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293L16 6.586A1 1 0 0116 7v10a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Resume Uploaded</h3>
              <p className="text-gray-600 mb-4">
                Your teacher hasn&apos;t uploaded a resume for you yet.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h4 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Your teacher will upload your resume</li>
                  <li>• It will be analyzed by AI for skills and experience</li>
                  <li>• You&apos;ll be able to view the analysis and extracted information</li>
                  <li>• Resume data will be used to personalize your interview questions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ResumesPage;
